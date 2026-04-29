"use server";

import { getRecipes } from "@/lib/db/recipes";
import { getDaysInRange as getDaysToPlan, getMaxDaysSinceLastUsedCandidate, getMealTimeLimit, markBatchSlots, formatDayLabel } from "@/lib/planner/helpers";
import { PlanInputType, SlotSaveData } from "@/types/planner";
import { RecipeType } from "@/types/recipe";
import { createPlan, deletePlanById, updatePlan } from "@/lib/db/planner";
import { MEAL_TYPES, ROUTES } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { filterByFlavour, filterByHandsOnTime, filterByTotalTime } from "@/lib/planner/filters";
import { DayTimeLimitsType, RollingRecipeType } from "@/lib/validations/planner";
import { pickBestCandidate } from "@/lib/planner/scoring";
import { generateBaselineLogForPlan } from "@/lib/db/planner";

export async function generatePlan(
  start: Date,
  end: Date,
  allDaysTimeLimits: DayTimeLimitsType[],
  fridgeIngredientIds: string[],
  rollingRecipes: RollingRecipeType[],
): Promise<
  | { type: "success"; plan: PlanInputType; warnings: string[] }
  | { type: "error"; message: string }
> {
  try {
    // No flavour filter in planner context; include only planner-eligible recipes.
    const recipes = await getRecipes(undefined, undefined, false);

    if (recipes.length === 0) {
      return { type: "error", message: "No recipes available to plan." };
    }

    const days = getDaysToPlan(start, end); //get all days between start and end dates
    const plan: PlanInputType = []; //initialize empty plan
    const batchFilledSlots = new Map<string, RecipeType>(); // track batch carry-forward: slotKey → forced recipe

    for (const day of days) { //for the given day 
      const dateStr = day.toISOString().slice(0, 10);
      const dayTimeLimits = allDaysTimeLimits.find((d) => d.date === dateStr);

      for (const mealType of MEAL_TYPES) { // for the given meal type in the given day
        const slotKey = `${day.toISOString()}-${mealType}`;
        const batchRecipe = batchFilledSlots.get(slotKey); // check if this slot is claimed by a batch carry-forward

        // Always run scoring to compute alternatives (even for batch slots)
        let candidates = filterByFlavour(recipes, mealType);
        candidates = filterByHandsOnTime(candidates, getMealTimeLimit(dayTimeLimits, mealType, "handsOn"));
        candidates = filterByTotalTime(candidates, getMealTimeLimit(dayTimeLimits, mealType, "total"));

        if (candidates.length === 0) {
          return {
            type: "error",
            message: `No recipes available for ${mealType.toLowerCase()} on ${formatDayLabel(day)}.`,
          };
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

        if (batchRecipe) {
          // Batch carry-forward slot: use forced recipe, alternatives from scoring (excluding the batch recipe)
          const alts = [winner, ...alternatives].filter((r) => r.id !== batchRecipe.id).slice(0, 10);
          plan.push({ date: new Date(day), mealType, recipe: batchRecipe, alternatives: alts, used: false });
        } else {
          // Normal slot: use scoring winner
          plan.push({ date: new Date(day), mealType, recipe: winner, alternatives, used: false });

          // Mark batch carry-forward slots for this recipe
          const rollingEntry = rollingRecipes.find((r) => r.recipeId === winner.id);
          const overrideMeals = rollingEntry ? rollingEntry.meals : undefined;
          markBatchSlots(winner, mealType, days.indexOf(day), days, batchFilledSlots, overrideMeals);
        }
      }
    }

    // Check for unplaced rolling recipes and generate warnings
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
    const created = await createPlan(startDate, endDate, plan);
    if (created.type === "date_conflict") {
      return created;
    }
    planId = created.plan.id;
    // Create paired baseline log immediately so Planner/Log shared view stays in sync.
    const baselineLogResult = await generateBaselineLogForPlan(planId);
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
    const result = await updatePlan(planId, slots, options);
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
    const result = await generateBaselineLogForPlan(planId);
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
    await deletePlanById(planId);
  } catch (error) {
    console.error("Error deleting plan", error);
    return { type: "error", message: "Failed to delete plan." };
  }

  revalidatePath(ROUTES.planCurrent);
  revalidatePath(ROUTES.log);
  revalidatePath("/");
  return { type: "success" };
}