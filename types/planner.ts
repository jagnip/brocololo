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
      extraPortions?: number;
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
   * When true (default), non-batch recipes with plannedMealCount > 1 also fill
   * following empty same-meal slots. Manual batch recipes never fill
   * unselected slots; bulk replace sets this false for every recipe.
   */
  expandMultiMeal?: boolean;
  /**
   * Explicit batch group for bulk batch placement. Every selected slot shares
   * this id so they read as one cook and consume the same Storage remainder.
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
  isRolledOver?: boolean;
  alreadyCooked?: boolean;
  /** Anonymous one-serving portions for this recipe slot. */
  extraPortions?: number;
  /** Shared id across slots placed together as one multi-meal placement; null when alone. */
  batchGroupId?: string | null;
};

export type PlanInputType = SlotInputType[];

export type PlanBatchStorageRow = {
  count: number;
  cookingFamilyMemberIds: string[];
};

/** Shared data for one actual batch cook. `id` matches its slots' batchGroupId. */
export type PlanBatchInput = {
  id: string;
  recipeId: string;
  storageRows: PlanBatchStorageRow[];
  /** @deprecated Legacy client fixture compatibility; ignored on persistence. */
  extraPortions?: number;
};

export type PlanBatchSaveData = PlanBatchInput;

export type SlotSaveData = {
  date: Date;
  mealType: PlannerMealType;
  recipeId: string | null;
  customMeal: PlanCustomMeal | null;
  alternativeRecipeIds: string[];
  cookingFamilyMemberIds: string[];
  used: boolean;
  isRolledOver?: boolean;
  alreadyCooked?: boolean;
  extraPortions?: number;
  batchGroupId?: string | null;
};
