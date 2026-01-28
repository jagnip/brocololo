import type { RecipeType } from "@/types/recipe";
import { MealType, Prisma } from "@/src/generated/client";

export type DayMealsType = {
  date: Date;
  breakfast: SlotInputType;
  lunch: SlotInputType;
  dinner: SlotInputType;
};

//Input Types
export type SlotInputType = {
  date: Date;
  mealType: MealType;
  recipe: RecipeType | null;
  alternatives: RecipeType[];
  used: boolean;
};


export type PlanInputType = SlotInputType[];

export type SlotSaveData = {
  date: Date;
  mealType: MealType;
  recipeId: string | null;
  alternativeRecipeIds: string[];
  used: boolean;
};
