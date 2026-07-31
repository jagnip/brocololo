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
  | {
      kind: "recipe";
      recipe: RecipeType;
      /** When set, also updates the slot audience in the same operation. */
      cookingFamilyMemberIds?: string[];
    }
  | {
      kind: "custom";
      name: string;
      ingredients: PlanCustomMealIngredient[];
      cookingFamilyMemberIds?: string[];
    }
  | { kind: "empty" };

/** Options for manual meal placement in the plan editor. */
export type SetPlanMealOptions = {
  /**
   * When true (default), recipes with plannedMealCount > 1 also fill following
   * empty same-meal slots and share a batchGroupId — same as plan generation.
   * Bulk replace sets this false so only the selected slots change.
   */
  expandMultiMeal?: boolean;
  /**
   * Explicit batch group for non-expanding placement. Bulk assignment of a
   * batch recipe passes one shared id so the selected slots read as one cook.
   */
  batchGroupId?: string | null;
};

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
  /** Shared id across slots placed together as one multi-meal placement; null when alone. */
  batchGroupId?: string | null;
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
  batchGroupId?: string | null;
};
