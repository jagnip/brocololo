"use server";

import { getRecipes } from "@/lib/db/recipes";
import { listFamilyMembers } from "@/lib/db/family-members";
import {
  getDaysInRange as getDaysToPlan,
  getMaxDaysSinceLastUsedCandidate,
  getMealTimeLimit,
  getPlannerMealCount,
  markBatchSlots,
} from "@/lib/planner/helpers";
import { getSlotAudienceIdsForMeal } from "@/lib/planner/audience-mapping";
import { PlanInputType, SlotSaveData } from "@/types/planner";
import { RecipeType } from "@/types/recipe";
import { createPlan, deletePlanById, updatePlan } from "@/lib/db/planner";
import { MEAL_TYPES, ROUTES } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { filterByMealOccasion, filterByHandsOnTime, filterByTotalTime } from "@/lib/planner/filters";
import { DayAudienceByMealType, DayTimeLimitsType, RollingRecipeType } from "@/lib/validations/planner";
import { pickBestCandidate } from "@/lib/planner/scoring";
import { generateBaselineLogForPlan } from "@/lib/db/planner";
import { requireUser } from "@/lib/auth/session";
import { MESSAGES } from "@/lib/messages";

const PLAN_GENERATION_FAILED_MESSAGE = MESSAGES.planner.generationFailedMessage;

export async function generatePlan(
  start: Date,
  end: Date,
  dailyAudienceByMeal: DayAudienceByMealType[],
  allDaysTimeLimits: DayTimeLimitsType[],
  fridgeIngredientIds: string[],
  rollingRecipes: RollingRecipeType[],
): Promise<
  | { type: "success"; plan: PlanInputType; warnings: string[] }
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

    const days = getDaysToPlan(start, end);
    const plan: PlanInputType = [];
    const batchFilledSlots = new Map<string, RecipeType>();
    const batchSlotAudience = new Map<string, string[]>();
    const batchSlotGroupIds = new Map<string, string>();

    for (const day of days) {
      const dateStr = day.toISOString().slice(0, 10);
      const dayTimeLimits = allDaysTimeLimits.find((d) => d.date === dateStr);
      const dayAudience = dailyAudienceByMeal.find((d) => d.date === dateStr);

      for (const mealType of MEAL_TYPES) {
        const slotAudienceIds = [
          ...new Set(getSlotAudienceIdsForMeal(dayAudience, mealType)),
        ];
        const slotKey = `${day.toISOString()}-${mealType}`;
        // Continuation check first — leftover/repeat slots already know their recipe
        // and must not be blocked by fresh-candidate time-limit filtering.
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
          });
          continue;
        }

        let candidates = filterByMealOccasion(recipes, mealType);
        candidates = filterByHandsOnTime(candidates, getMealTimeLimit(dayTimeLimits, mealType, "handsOn"));
        candidates = filterByTotalTime(candidates, getMealTimeLimit(dayTimeLimits, mealType, "total"));

        if (candidates.length === 0) {
          return { type: "error", message: PLAN_GENERATION_FAILED_MESSAGE };
        }

        const maxDaysSinceLastUsedCandidate = getMaxDaysSinceLastUsedCandidate(candidates, day);
        const ctx = {
          assignedSlots: plan,
          currentSlot: { date: day, mealType },
          maxDaysSinceLastUsedCandidate,
          fridgeIngredientIds,
          rollingRecipeIds: rollingRecipes.map((r) => r.recipeId),
        };
        const { winner, alternatives } = pickBestCandidate(candidates, ctx);

        const rollingEntry = rollingRecipes.find((r) => r.recipeId === winner.id);
        const overrideMeals = rollingEntry ? rollingEntry.meals : undefined;
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
        });

        if (batchGroupId) {
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
              // Batch leftovers skip time checks; non-batch repeats enforce them per day.
              enforceTimeLimit: !winner.isBatchRecipe,
              allDaysTimeLimits,
            },
          );
        }
      }
    }

    const placedRecipeIds = new Set(plan.filter((s) => s.recipe).map((s) => s.recipe!.id));
    const warnings: string[] = [];
    for (const r of rollingRecipes) {
      if (!placedRecipeIds.has(r.recipeId)) {
        const name = recipes.find((rec) => rec.id === r.recipeId)?.name ?? r.recipeId;
        warnings.push(`Could not place "${name}" — no compatible slot available.`);
      }
    }

    return { type: "success", plan, warnings };
  } catch (error) {
    console.error("Error generating plan", error);
    return { type: "error", message: "Failed to generate plan." };
  }
}

export async function savePlan(plan: PlanInputType): Promise<
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
    const created = await createPlan(userId, startDate, endDate, plan);
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
    const result = await updatePlan(userId, planId, slots, options);
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
  revalidatePath(ROUTES.log);
  revalidatePath("/");
  return { type: "success" };
}
