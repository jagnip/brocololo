import type { RecipeType } from "@/types/recipe";
import { PlannerMealType, Prisma } from "@/src/generated/client";

export type DayMealsType = {
  date: Date;
  breakfast: SlotInputType;
  lunch: SlotInputType;
  dinner: SlotInputType;
};

//Input Types
export type SlotInputType = {
  date: Date;
  mealType: PlannerMealType;
  recipe: RecipeType | null;
  alternatives: RecipeType[];
  used: boolean;
};


export type PlanInputType = SlotInputType[];

export type SlotSaveData = {
  date: Date;
  mealType: PlannerMealType;
  recipeId: string | null;
  alternativeRecipeIds: string[];
  used: boolean;
};
