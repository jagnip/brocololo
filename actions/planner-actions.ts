"use server";

import { getRecipes } from "@/lib/db/recipes";
import { getDaysInRange } from "@/lib/utils";
import { PlanInputType } from "@/types/planner";
import { createPlan } from "@/lib/db/planner";
import { MealType } from "@/src/generated/enums";
import { MEAL_TYPES } from "@/lib/constants";




export async function generatePlan(start: Date, end: Date): Promise<
  | { type: "success"; plan: PlanInputType }
  | { type: "error"; message: string }
> {
  try {
    const recipes = await getRecipes([], undefined);

    if (recipes.length === 0) {
      return { type: "error", message: "No recipes available to plan." };
    }

    const days = getDaysInRange(start, end);


    const plan: PlanInputType = [];

    for (const date of days) {
      for (const mealType of MEAL_TYPES) {
        const recipe = recipes[Math.floor(Math.random() * recipes.length)]!;
        plan.push({
          date: new Date(date),
          mealType,
          recipe,
        });
      }
    }

    return { type: "success", plan };
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

  try {
    const created = await createPlan(startDate, endDate, plan);
    return { type: "success", planId: created.id };
  } catch (error) {
    console.error("Error saving plan", error);
    return { type: "error", message: "Failed to save plan." };
  }
}