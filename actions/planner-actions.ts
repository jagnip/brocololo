"use server";

import { getRecipes } from "@/lib/db/recipes";
import { listFamilyMembers } from "@/lib/db/family-members";
import {
  getDaysInRange as getDaysToPlan,
  getMaxDaysSinceLastUsedCandidate,
  getMealTimeLimit,
  getEffectivePlannerRecipe,
  getPlannerMealCount,
  markBatchSlots,
} from "@/lib/planner/helpers";
import { getSlotAudienceIdsForMeal } from "@/lib/planner/audience-mapping";
import { PlanBatchInput, PlanInputType, SlotSaveData } from "@/types/planner";
import { RecipeType } from "@/types/recipe";
import { createPlan, deletePlanById, updatePlan } from "@/lib/db/planner";
import { MEAL_TYPES, ROUTES } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { filterByMealOccasion } from "@/lib/planner/filters";
import { DayAudienceByMealType, DayTimeLimitsType, RollingRecipeType } from "@/lib/validations/planner";
import { isRecipeAvoidedByAudience, pickBestCandidate } from "@/lib/planner/scoring";
import { generateBaselineLogForPlan } from "@/lib/db/planner";
import { requireUser } from "@/lib/auth/session";
import { MESSAGES } from "@/lib/messages";
import { planBatchesSaveSchema, planSlotsSaveSchema } from "@/lib/validations/planner";

const PLAN_GENERATION_FAILED_MESSAGE = MESSAGES.planner.generationFailedMessage;

export async function generatePlan(
  start: Date,
  end: Date,
  dailyAudienceByMeal: DayAudienceByMealType[],
  allDaysTimeLimits: DayTimeLimitsType[],
  fridgeIngredientIds: string[],
  rollingRecipes: RollingRecipeType[],
  /** Current draft — filled slots are preserved; only empties are generated. */
  existingPlan: PlanInputType = [],
  existingBatches: PlanBatchInput[] = [],
): Promise<
  | { type: "success"; plan: PlanInputType; batches: PlanBatchInput[]; warnings: string[] }
  | { type: "error"; message: string }
> {
  try {
    const { id: userId } = await requireUser();
    const familyMembers = await listFamilyMembers(userId);
    const ownedFamilyMemberIds = new Set(familyMembers.map((member) => member.id));

    for (const dayAudience of dailyAudienceByMeal) {
      for (const mealType of MEAL_TYPES) {
        const slotAudienceIds = getSlotAudienceIdsForMeal(dayAudience, mealType);
        if (
          slotAudienceIds.length === 0 ||
          slotAudienceIds.some((id) => !ownedFamilyMemberIds.has(id))
        ) {
          return { type: "error", message: "Choose who you are cooking for." };
        }
      }
    }

    const recipes = await getRecipes(userId, undefined, undefined, false);

    if (recipes.length === 0) {
      return { type: "error", message: PLAN_GENERATION_FAILED_MESSAGE };
    }

    // Index existing draft slots so we can preserve hand-filled meals.
    const existingByKey = new Map<string, (typeof existingPlan)[number]>();
    for (const slot of existingPlan) {
      existingByKey.set(`${slot.date.toISOString()}-${slot.mealType}`, slot);
    }
    const reservedSlotKeys = new Set(
      [...existingByKey.entries()]
        .filter(([, slot]) => slot.recipe != null || slot.customMeal != null)
        .map(([key]) => key),
    );

    const days = getDaysToPlan(start, end);
    const dayKeys = new Set(days.map((day) => day.toISOString()));
    const remainingRolling = new Map(
      rollingRecipes.map((entry) => [entry.recipeId, entry.meals]),
    );
    // Reserve scheduled and stored rolling meals before scheduling continuations.
    for (const slot of existingByKey.values()) {
      if (slot.recipe && slot.isRolledOver && dayKeys.has(slot.date.toISOString())) {
        remainingRolling.set(
          slot.recipe.id,
          Math.max((remainingRolling.get(slot.recipe.id) ?? 0) - 1, 0),
        );
      }
    }
    for (const batch of existingBatches) {
      // Retained Storage stays allocated even when the cooked toggle hides it.
      const hasRetainedRollingSlot = [...existingByKey.values()].some(
        (slot) => slot.isRolledOver &&
          slot.batchGroupId === batch.id && slot.recipe?.id === batch.recipeId &&
          dayKeys.has(slot.date.toISOString()),
      );
      if (hasRetainedRollingSlot) {
        const storedMeals = batch.storageRows.reduce((count, row) => count + row.count, 0);
        remainingRolling.set(
          batch.recipeId,
          Math.max((remainingRolling.get(batch.recipeId) ?? 0) - storedMeals, 0),
        );
      }
    }
    const plan: PlanInputType = [];
    const batchFilledSlots = new Map<string, RecipeType>();
    const batchSlotAudience = new Map<string, string[]>();
    const batchSlotGroupIds = new Map<string, string>();
    const batchGroupFlags = new Map<
      string,
      { isRolledOver: boolean; alreadyCooked: boolean }
    >();
    const generatedBatches = new Map<
      string,
      { recipeId: string; storageRows: PlanBatchInput["storageRows"] }
    >();
    const warnings: string[] = [];
    let emptySlotsAttempted = 0;
    let emptySlotsFilled = 0;

    for (const day of days) {
      const dateStr = day.toISOString().slice(0, 10);
      const dayTimeLimits = allDaysTimeLimits.find((d) => d.date === dateStr);
      const dayAudience = dailyAudienceByMeal.find((d) => d.date === dateStr);

      for (const mealType of MEAL_TYPES) {
        const slotAudienceIds = [
          ...new Set(getSlotAudienceIdsForMeal(dayAudience, mealType)),
        ];
        const slotKey = `${day.toISOString()}-${mealType}`;

        // Preserve hand-filled / previously filled meals — never overwrite.
        const existingSlot = existingByKey.get(slotKey);
        if (
          existingSlot &&
          (existingSlot.recipe != null || existingSlot.customMeal != null)
        ) {
          plan.push({
            ...existingSlot,
            date: new Date(day),
            mealType,
          });
          continue;
        }

        // Continuations were checked when reserved, before fresh-candidate filtering.
        const batchRecipe = batchFilledSlots.get(slotKey);
        const batchAudienceIds = batchSlotAudience.get(slotKey) ?? slotAudienceIds;
        const continuationGroupId = batchSlotGroupIds.get(slotKey) ?? null;

        if (batchRecipe) {
          plan.push({
            date: new Date(day),
            mealType,
            recipe: batchRecipe,
            customMeal: null,
            alternatives: [],
            cookingFamilyMemberIds: batchAudienceIds,
            used: false,
            batchGroupId: continuationGroupId,
            ...batchGroupFlags.get(continuationGroupId ?? ""),
          });
          emptySlotsAttempted += 1;
          emptySlotsFilled += 1;
          continue;
        }

        emptySlotsAttempted += 1;

        const handsOnLimit = getMealTimeLimit(dayTimeLimits, mealType, "handsOn");
        const totalLimit = getMealTimeLimit(dayTimeLimits, mealType, "total");
        const candidates = filterByMealOccasion(recipes, mealType).filter((recipe) => {
          if (isRecipeAvoidedByAudience(recipe, slotAudienceIds)) return false;
          const effectiveRecipe = getEffectivePlannerRecipe(
            recipe,
            (remainingRolling.get(recipe.id) ?? 0) > 0 &&
              rollingRecipes.some((entry) => entry.recipeId === recipe.id && entry.alreadyCooked),
          );
          return (handsOnLimit === null || effectiveRecipe.handsOnTime <= handsOnLimit) &&
            (totalLimit === null || effectiveRecipe.totalTime <= totalLimit);
        });

        // Leave the slot empty with a warning instead of failing the whole fill.
        if (candidates.length === 0) {
          plan.push({
            date: new Date(day),
            mealType,
            recipe: null,
            customMeal: null,
            alternatives: [],
            cookingFamilyMemberIds: slotAudienceIds,
            used: false,
            batchGroupId: null,
            isRolledOver: false,
            alreadyCooked: false,
          });
          warnings.push(`No recipes fit ${mealType.toLowerCase()} on ${dateStr}.`);
          continue;
        }

        const maxDaysSinceLastUsedCandidate = getMaxDaysSinceLastUsedCandidate(candidates, day);
        const ctx = {
          assignedSlots: plan,
          currentAudienceFamilyMemberIds: slotAudienceIds,
          currentSlot: { date: day, mealType },
          maxDaysSinceLastUsedCandidate,
          fridgeIngredientIds,
          rollingRecipeIds: rollingRecipes
            .filter((r) => (remainingRolling.get(r.recipeId) ?? 0) > 0)
            .map((r) => r.recipeId),
        };
        const { winner, alternatives } = pickBestCandidate(candidates, ctx);

        const rollingEntry = rollingRecipes.find(
          (r) => r.recipeId === winner.id && (remainingRolling.get(r.recipeId) ?? 0) > 0,
        );
        const overrideMeals = rollingEntry ? remainingRolling.get(winner.id) : undefined;
        const flags = {
          isRolledOver: !!rollingEntry,
          alreadyCooked: !!rollingEntry?.alreadyCooked && winner.isBatchRecipe,
        };
        const totalMeals = overrideMeals ?? getPlannerMealCount(winner);
        // Multi-meal placements share a group id so badges can recount after edits.
        const batchGroupId =
          totalMeals >= 2 ? crypto.randomUUID() : null;

        plan.push({
          date: new Date(day),
          mealType,
          recipe: winner,
          customMeal: null,
          alternatives,
          cookingFamilyMemberIds: slotAudienceIds,
          used: false,
          batchGroupId,
          ...flags,
        });
        emptySlotsFilled += 1;

        if (batchGroupId) {
          batchGroupFlags.set(batchGroupId, flags);
          const previousContinuationCount = batchFilledSlots.size;
          markBatchSlots(
            winner,
            mealType,
            days.indexOf(day),
            days,
            batchFilledSlots,
            batchSlotAudience,
            batchSlotGroupIds,
            slotAudienceIds,
            batchGroupId,
            {
              overrideMeals,
              // Uncooked batch leftovers retain normal behavior; cooked meals need 10 minutes.
              enforceTimeLimit: !winner.isBatchRecipe,
              alreadyCooked: flags.alreadyCooked,
              allDaysTimeLimits,
              reservedSlotKeys,
            },
          );
          const unplacedMeals = totalMeals - 1 - (batchFilledSlots.size - previousContinuationCount);
          const storageRows: PlanBatchInput["storageRows"] =
            winner.isBatchRecipe && !flags.alreadyCooked && unplacedMeals > 0
              ? [{ count: unplacedMeals, cookingFamilyMemberIds: [...slotAudienceIds] }]
              : [];
          if (winner.isBatchRecipe) {
            generatedBatches.set(batchGroupId, {
              recipeId: winner.id,
              storageRows,
            });
          }
          if (rollingEntry) {
            remainingRolling.set(
              winner.id,
              storageRows.length > 0 ? 0 : unplacedMeals,
            );
          }
        } else if (rollingEntry) {
          remainingRolling.set(winner.id, 0);
        }
      }
    }

    // Tried to fill empties but nothing landed — treat as generation failure.
    if (emptySlotsAttempted > 0 && emptySlotsFilled === 0) {
      return { type: "error", message: PLAN_GENERATION_FAILED_MESSAGE };
    }

    for (const r of rollingRecipes) {
      if ((remainingRolling.get(r.recipeId) ?? 0) > 0) {
        const name = recipes.find((rec) => rec.id === r.recipeId)?.name ?? r.recipeId;
        warnings.push(`Could not place "${name}" — no compatible slot available.`);
      }
    }

    const generatedBatchValues: PlanBatchInput[] = [...generatedBatches].flatMap(
      ([id, batch]) => {
        const scheduledCount = plan.filter(
          (slot) =>
            slot.batchGroupId === id && slot.recipe?.id === batch.recipeId,
        ).length;
        if (scheduledCount === 0) return [];
        return [
          {
            id,
            recipeId: batch.recipeId,
            storageRows: batch.storageRows,
            extraPortions: 0,
          },
        ];
      },
    );
    const generatedIds = new Set(generatedBatchValues.map((batch) => batch.id));
    const batches = [
      ...existingBatches.filter(
        (batch) =>
          !generatedIds.has(batch.id) &&
          plan.some(
            (slot) =>
              slot.batchGroupId === batch.id &&
              slot.recipe?.id === batch.recipeId,
          ),
      ),
      ...generatedBatchValues,
    ];
    return { type: "success", plan, batches, warnings };
  } catch (error) {
    console.error("Error generating plan", error);
    return { type: "error", message: "Failed to generate plan." };
  }
}

export async function savePlan(
  plan: PlanInputType,
  batches: PlanBatchInput[] = [],
): Promise<
  | { type: "success"; planId: string }
  | {
      type: "date_conflict";
      dates: string[];
      conflictingLogIds: string[];
      conflictingPlanIds: string[];
    }
  | { type: "error"; message: string }
> {
  if (plan.length === 0) {
    return { type: "error", message: "No plan to save." };
  }

  const dates = plan.map((s) => s.date.getTime());
  const startDate = new Date(Math.min(...dates));
  const endDate = new Date(Math.max(...dates));

  let planId: string;
  try {
    const { id: userId } = await requireUser();
    const parsedBatches = planBatchesSaveSchema.parse(batches);
    const normalizedPlan = plan.map((slot) => ({
      ...slot,
      isRolledOver: slot.recipe != null && (slot.isRolledOver ?? false),
      alreadyCooked: slot.recipe != null && (slot.alreadyCooked ?? false),
    }));
    const created = await createPlan(userId, startDate, endDate, normalizedPlan, parsedBatches);
    if (created.type === "date_conflict") {
      return created;
    }
    planId = created.plan.id;
    // Create paired baseline log immediately so Planner/Log shared view stays in sync.
    const baselineLogResult = await generateBaselineLogForPlan(userId, planId);
    if (baselineLogResult.type === "date_conflict") {
      console.error("Unexpected baseline log date conflict after plan creation", {
        planId,
        dates: baselineLogResult.dates,
      });
    }
  } catch (error) {
    console.error("Error saving plan", error);
    return { type: "error", message: "Failed to save plan." };
  }

  revalidatePath("/"); // refreshes sidebar data
  redirect(ROUTES.planView(planId));
}

export async function updateSavedPlan(
  planId: string,
  slots: SlotSaveData[],
  options?: { forceDestructiveSync?: boolean },
  batches: PlanBatchInput[] = [],
): Promise<
  | { type: "success" }
  | {
      type: "date_conflict";
      dates: string[];
      conflictingLogIds: string[];
      conflictingPlanIds: string[];
    }
  | {
      type: "sync_conflict";
      impactedDates: string[];
      impactedLogMealsCount: number;
      impactedPlanMealsCount: number;
    }
  | { type: "error"; message: string }
> {
  if (slots.length === 0) {
    return { type: "error", message: "No meals in plan." };
  }

  try {
    const { id: userId } = await requireUser();
    const parsedBatches = planBatchesSaveSchema.parse(batches);
    const parsedSlots = planSlotsSaveSchema.parse(slots).map((slot) => ({
      ...slot,
      isRolledOver: slot.recipeId != null && slot.isRolledOver,
      alreadyCooked: slot.recipeId != null && slot.alreadyCooked,
    }));
    const result = await updatePlan(
      userId,
      planId,
      parsedSlots,
      options,
      parsedBatches,
    );
    if (result.type === "date_conflict") {
      return result;
    }
    if (result.type === "sync_conflict") {
      return result;
    }
  } catch (error) {
    console.error("Error updating plan", error);
    return { type: "error", message: "Failed to update plan." };
  }

  revalidatePath(ROUTES.planView(planId));
  revalidatePath(ROUTES.logPlanView(planId));
  revalidatePath("/");
  return { type: "success" };
}

export async function generateLogFromPlan(
  planId: string,
): Promise<
  | { type: "success"; logId: string }
  | { type: "date_conflict"; dates: string[] }
  | { type: "already_exists"; logId: string }
  | { type: "error"; message: string }
> {
  try {
    const { id: userId } = await requireUser();
    const result = await generateBaselineLogForPlan(userId, planId);
    revalidatePath(ROUTES.logPlanView(planId));
    revalidatePath(ROUTES.log);
    return result;
  } catch (error) {
    console.error("Error generating baseline log", error);
    return { type: "error", message: "Failed to generate log." };
  }
}

export async function deletePlanAction(
  planId: string,
): Promise<{ type: "success" } | { type: "error"; message: string }> {
  if (!planId) {
    return { type: "error", message: "Missing plan id." };
  }

  try {
    const { id: userId } = await requireUser();
    await deletePlanById(userId, planId);
  } catch (error) {
    console.error("Error deleting plan", error);
    return { type: "error", message: "Failed to delete plan." };
  }

  revalidatePath(ROUTES.planCurrent);
  revalidatePath(ROUTES.planView(planId));
  revalidatePath(ROUTES.logPlanView(planId));
  revalidatePath(ROUTES.logCurrent);
  revalidatePath(ROUTES.log);
  revalidatePath("/");
  return { type: "success" };
}
