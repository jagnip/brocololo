"use server";

import { getRecipes } from "@/lib/db/recipes";
import { getDaysInRange } from "@/lib/utils";
import { PlanDaysType } from "@/types/planner";
import { createPlan } from "@/lib/db/planner";

export async function generatePlan(start: Date, end: Date): Promise<
  | { type: "success"; plan: PlanDaysType }
  | { type: "error"; message: string }
> {
  try {
    const recipes = await getRecipes([], undefined);

    if (recipes.length === 0) {
      return { type: "error", message: "No recipes available to plan." };
    }

    const days = getDaysInRange(start, end);
    const plan: PlanDaysType = days.map((date) => ({
      date: new Date(date),
      breakfast: recipes[Math.floor(Math.random() * recipes.length)]!,
      lunch: recipes[Math.floor(Math.random() * recipes.length)]!,
      dinner: recipes[Math.floor(Math.random() * recipes.length)]!,
    }));

    return { type: "success", plan };
  } catch (error) {
    console.error("Error generating plan", error);
    return { type: "error", message: "Failed to generate plan." };
  }
}

export async function savePlan(plan: PlanDaysType): Promise<
  | { type: "success"; planId: string }
  | { type: "error"; message: string }
> {
  if (plan.length === 0) {
    return { type: "error", message: "No plan to save." };
  }

  const startDate = new Date(plan[0]!.date);
  const endDate = new Date(plan[plan.length - 1]!.date);

  const slots = plan.flatMap((day) => [
    { date: new Date(day.date), mealType: "BREAKFAST" as const, recipeId: day.breakfast.id },
    { date: new Date(day.date), mealType: "LUNCH" as const, recipeId: day.lunch.id },
    { date: new Date(day.date), mealType: "DINNER" as const, recipeId: day.dinner.id },
  ]);

  try {
    const created = await createPlan(startDate, endDate, slots);
    return { type: "success", planId: created.id };
  } catch (error) {
    console.error("Error saving plan", error);
    return { type: "error", message: "Failed to save plan." };
  }
}