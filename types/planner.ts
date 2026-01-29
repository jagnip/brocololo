import type { RecipeType } from "@/types/recipe";

export type PlanDay = {
  date: Date;
  breakfast: RecipeType;
  lunch: RecipeType;
  dinner: RecipeType;
};

export type Plan = PlanDay[];