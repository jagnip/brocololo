"use server";

import { getRecipes } from "@/lib/db/recipes";
import { getDaysInRange as getDaysToPlan, getMaxDaysSinceLastUsedCandidate, getMealHandsOnLimit, carryForwardBatchPortions } from "@/lib/planner/helpers";
import { PlanInputType } from "@/types/planner";
import { createPlan } from "@/lib/db/planner";
import { MealType } from "@/src/generated/enums";
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
    const filledSlots = new Set<string>(); // track slots filled by batch carry-forward

    for (const day of days) { //for the given day 
      const dateStr = day.toLocaleDateString("en-GB");
      const dayHandsOnLimits = allDaysHandsOnLimits.find((d) => d.date === dateStr); //get hands on limits for the current day

      for (const mealType of MEAL_TYPES) { // for the given meal type in the given day
        const slotKey = `${day.toISOString()}-${mealType}`;
        if (filledSlots.has(slotKey)) continue; // already filled by batch carry-forward

        let candidates = filterByFlavour(recipes, mealType); //filter sweet recipes for breakfast and savoury recipes for lunch and dinner
        candidates = filterByHandsOnTime(candidates, getMealHandsOnLimit(dayHandsOnLimits, mealType)); //filter recipes that have hands on time less than the limit for the given meal type on the given day (from the form)

        if (candidates.length === 0) {
          return {
            type: "error",
            message: `No recipes available for ${mealType.toLowerCase()} on ${dateStr}.`,
          };
        }
          const maxDaysSinceLastUsedCandidate = getMaxDaysSinceLastUsedCandidate(candidates, day); // Get the max recency gap among candidates so the recency scorer can normalise to 0–1 

          const recipe = pickBestCandidate(candidates, { // Pick the best candidate for the current slot based on the scoring context
            assignedSlots: plan,
            currentSlot: { date: day, mealType },
            maxDaysSinceLastUsedCandidate: maxDaysSinceLastUsedCandidate,
            fridgeIngredientIds,
            rollingRecipeIds: rollingRecipes.map((r) => r.recipeId),
          });
          
        plan.push({ date: new Date(day), mealType, recipe });

        // Batch cooking: carry forward extra portions to same meal type on following days
        // Rolling recipes use user-specified meal count; non-rolling use recipe.servings
        const rollingEntry = rollingRecipes.find((r) => r.recipeId === recipe.id);
        const overrideMeals = rollingEntry ? rollingEntry.meals : undefined;
        carryForwardBatchPortions(recipe, mealType, days.indexOf(day), days, plan, filledSlots, overrideMeals);
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