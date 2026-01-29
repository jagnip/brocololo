"use server";

import { getRecipes } from "@/lib/db/recipes";
import { getDaysInRange } from "@/lib/utils";
import { Plan } from "@/types/planner";

export async function generatePlan(start: Date, end: Date): Promise<
  | { type: "success"; plan: Plan }
  | { type: "error"; message: string }
> {
  try {
    const recipes = await getRecipes([], undefined);

    if (recipes.length === 0) {
      return { type: "error", message: "No recipes available to plan." };
    }

    const days = getDaysInRange(start, end);
    const plan: Plan = days.map((date) => ({
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