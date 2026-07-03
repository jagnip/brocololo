import type { RecipeType } from "@/types/recipe";
import type { PlannerMealType } from "@/src/generated/enums";

export type PlanCustomMealIngredient = {
  ingredientId: string;
  unitId: string | null;
  amount: number | null;
};

export type PlanCustomMeal = {
  name: string;
  ingredients: PlanCustomMealIngredient[];
};

export type PlanSlotMealPayload =
  | { kind: "recipe"; recipe: RecipeType }
  | { kind: "custom"; name: string; ingredients: PlanCustomMealIngredient[] }
  | { kind: "empty" };

export type DayMealsType = {
  date: Date;
  breakfast: SlotInputType;
  lunch: SlotInputType;
  dinner: SlotInputType;
};

// Input Types
export type SlotInputType = {
  /** Present when loaded from DB; absent during create-plan generation before save. */
  id?: string;
  date: Date;
  mealType: PlannerMealType;
  recipe: RecipeType | null;
  customMeal: PlanCustomMeal | null;
  alternatives: RecipeType[];
  cookingFamilyMemberIds?: string[];
  used: boolean;
};

export type PlanInputType = SlotInputType[];

export type SlotSaveData = {
  date: Date;
  mealType: PlannerMealType;
  recipeId: string | null;
  customMeal: PlanCustomMeal | null;
  alternativeRecipeIds: string[];
  cookingFamilyMemberIds: string[];
  used: boolean;
};
