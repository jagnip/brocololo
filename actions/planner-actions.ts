"use server";

import { getRecipes } from "@/lib/db/recipes";
import { getDaysInRange as getDaysToPlan, getMaxDaysSinceLastUsedCandidate, getMealHandsOnLimit, markBatchSlots } from "@/lib/planner/helpers";
import { PlanInputType } from "@/types/planner";
import { RecipeType } from "@/types/recipe";
import { createPlan } from "@/lib/db/planner";
import { MEAL_TYPES, ROUTES } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { filterByFlavour, filterExcluded, filterByHandsOnTime } from "@/lib/planner/filters";
import { DayHandsOnType, RollingRecipeType } from "@/lib/validations/planner";
import { pickBestCandidate } from "@/lib/planner/scoring";


export async function generatePlan(
  start: Date,
  end: Date,
  allDaysHandsOnLimits: DayHandsOnType[],
  fridgeIngredientIds: string[],
  rollingRecipes: RollingRecipeType[],
): Promise<
  | { type: "success"; plan: PlanInputType; warnings: string[] }
  | { type: "error"; message: string }
> {
  try {
    const recipes = await getRecipes([], undefined, false); //get all recipes that are not excluded from planner

    if (recipes.length === 0) {
      return { type: "error", message: "No recipes available to plan." };
    }

    const days = getDaysToPlan(start, end); //get all days between start and end dates
    const plan: PlanInputType = []; //initialize empty plan
    const batchFilledSlots = new Map<string, RecipeType>(); // track batch carry-forward: slotKey → forced recipe

    for (const day of days) { //for the given day 
      const dateStr = day.toLocaleDateString("en-GB");
      const dayHandsOnLimits = allDaysHandsOnLimits.find((d) => d.date === dateStr); //get hands on limits for the current day

      for (const mealType of MEAL_TYPES) { // for the given meal type in the given day
        const slotKey = `${day.toISOString()}-${mealType}`;
        const batchRecipe = batchFilledSlots.get(slotKey); // check if this slot is claimed by a batch carry-forward

        // Always run scoring to compute alternatives (even for batch slots)
        let candidates = filterByFlavour(recipes, mealType);
        candidates = filterByHandsOnTime(candidates, getMealHandsOnLimit(dayHandsOnLimits, mealType));

        if (candidates.length === 0) {
          return {
            type: "error",
            message: `No recipes available for ${mealType.toLowerCase()} on ${dateStr}.`,
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
          plan.push({ date: new Date(day), mealType, recipe: batchRecipe, alternatives: alts });
        } else {
          // Normal slot: use scoring winner
          plan.push({ date: new Date(day), mealType, recipe: winner, alternatives });

          // Mark batch carry-forward slots for this recipe
          const rollingEntry = rollingRecipes.find((r) => r.recipeId === winner.id);
          const overrideMeals = rollingEntry ? rollingEntry.meals : undefined;
          markBatchSlots(winner, mealType, days.indexOf(day), days, batchFilledSlots, overrideMeals);
        }
      }
    }

    // Check for unplaced rolling recipes and generate warnings
    const placedRecipeIds = new Set(plan.map((s) => s.recipe.id));
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
    planId = created.id;
    // return { type: "success", planId: created.id };
  } catch (error) {
    console.error("Error saving plan", error);
    return { type: "error", message: "Failed to save plan." };
  }

  revalidatePath("/"); // refreshes sidebar data
  redirect(ROUTES.planView(planId));
}