"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { IngredientType } from "@/types/ingredient";
import type { RecipeType } from "@/types/recipe";
import { buildEffectiveRecipeForSimulation } from "@/lib/recipes/helpers";
import {
  useRecipeScalingState,
  type CalorieTarget,
} from "@/components/recipes/recipe-page/use-recipe-scaling-state";
import { useRecipeNutrition } from "@/components/recipes/recipe-page/use-recipe-nutrition";
import { useIngredientGrouping } from "@/components/recipes/recipe-page/use-ingredient-grouping";
import type { FamilyMemberRow } from "@/lib/db/family-members";

type RecipePageProviderProps = {
  recipe: RecipeType;
  ingredients: IngredientType[];
  familyMembers: FamilyMemberRow[];
  availableLogDateKeys: string[];
  children: ReactNode;
};

type RecipePageContextValue = {
  recipe: RecipeType;
  ingredients: IngredientType[];
  familyMembers: FamilyMemberRow[];
  selectedInstructionFamilyMemberId: string | null;
  setSelectedInstructionFamilyMemberId: Dispatch<SetStateAction<string | null>>;
  currentServings: number;
  calorieTarget: CalorieTarget | null;
  nutritionRows: ReturnType<typeof useRecipeNutrition>["nutritionRows"];
  onCaloriesChange: (familyMemberId: string, value: string) => void;
  effectiveRecipeIngredientById: Map<string, RecipeType["ingredients"][number]>;
  selectedUnits: Record<string, string | null>;
  getIngredientDisplayScalingFactor: (recipeIngredientId: string) => number;
  getIngredientCalorieFactor: (
    recipeIngredient: Pick<
      RecipeType["ingredients"][number],
      "memberAdjustments"
    >,
  ) => number;
  hasActiveScaling: boolean;
  hasActiveNutritionScaling: boolean;
  localScaleByIngredientId: Record<string, number>;
  ungroupedIngredients: RecipeType["ingredients"];
  visibleGroupedIngredients: Array<
    RecipeType["ingredientGroups"][number] & {
      ingredients: RecipeType["ingredients"];
    }
  >;
  onReset: () => void;
  onNutritionReset: () => void;
  onServingsChange: (nextServings: number) => void;
  onUnitChange: (recipeIngredientId: string, unitId: string | null) => void;
  onAmountEdit: (
    recipeIngredientId: string,
    ratio: number,
    activeCalorieScalingFactor: number,
  ) => void;
  onApplyScaleToAll: (recipeIngredientId: string) => void;
  onIngredientChange: (recipeIngredientId: string, ingredientId: string) => void;
  recipeForScaledNutrition: RecipeType;
  servingScalingFactor: number;
  availableLogDateKeys: string[];
};

const RecipePageContext = createContext<RecipePageContextValue | null>(null);

export function RecipePageProvider({
  recipe,
  ingredients,
  familyMembers,
  availableLogDateKeys,
  children,
}: RecipePageProviderProps) {
  const [
    selectedInstructionFamilyMemberId,
    setSelectedInstructionFamilyMemberId,
  ] = useState<string | null>(null);
  const scaling = useRecipeScalingState({ recipe });
  // Full household — per-person portion multipliers live in Settings, not recipe audience.
  const effectiveRecipe = useMemo(
    () =>
      buildEffectiveRecipeForSimulation(
        recipe,
        scaling.swapsByRecipeIngredientId,
        ingredients,
      ),
    [ingredients, recipe, scaling.swapsByRecipeIngredientId],
  );

  const nutrition = useRecipeNutrition({
    recipe,
    effectiveRecipe,
    ingredientCatalog: ingredients,
    currentServings: scaling.currentServings,
    calorieTarget: scaling.calorieTarget,
    globalScaleRatio: scaling.globalScaleRatio,
    localScaleByIngredientId: scaling.localScaleByIngredientId,
    familyMembers,
  });

  const { ungroupedIngredients, visibleGroupedIngredients } = useIngredientGrouping({
    ingredientGroups: recipe.ingredientGroups,
    ingredients: effectiveRecipe.ingredients,
  });

  const originalRecipeIngredientById = useMemo(
    () =>
      new Map(
        recipe.ingredients.map((recipeIngredient) => [
          recipeIngredient.id,
          recipeIngredient,
        ]),
      ),
    [recipe.ingredients],
  );

  const value = useMemo<RecipePageContextValue>(
    () => ({
      recipe,
      ingredients,
      familyMembers,
      selectedInstructionFamilyMemberId,
      setSelectedInstructionFamilyMemberId,
      currentServings: scaling.currentServings,
      calorieTarget: scaling.calorieTarget,
      nutritionRows: nutrition.nutritionRows,
      onCaloriesChange: scaling.handleCaloriesChange,
      effectiveRecipeIngredientById: nutrition.effectiveRecipeIngredientById,
      selectedUnits: scaling.selectedUnits,
      getIngredientDisplayScalingFactor: nutrition.getIngredientDisplayScalingFactor,
      getIngredientCalorieFactor: nutrition.getIngredientCalorieFactor,
      hasActiveScaling: scaling.hasActiveScaling,
      hasActiveNutritionScaling: scaling.hasActiveNutritionScaling,
      localScaleByIngredientId: scaling.localScaleByIngredientId,
      ungroupedIngredients,
      visibleGroupedIngredients,
      onReset: scaling.handleReset,
      onNutritionReset: scaling.handleNutritionReset,
      onServingsChange: scaling.handleServingsChange,
      onUnitChange: scaling.handleUnitChange,
      onAmountEdit: scaling.handleIngredientEdit,
      onApplyScaleToAll: scaling.handleApplyScaleToAll,
      onIngredientChange: (recipeIngredientId, ingredientId) =>
        scaling.handleIngredientChange(
          recipeIngredientId,
          ingredientId,
          originalRecipeIngredientById,
        ),
      recipeForScaledNutrition: nutrition.recipeForScaledNutrition,
      servingScalingFactor: nutrition.servingScalingFactor,
      availableLogDateKeys,
    }),
    [
      ingredients,
      familyMembers,
      nutrition.effectiveRecipeIngredientById,
      nutrition.getIngredientCalorieFactor,
      nutrition.getIngredientDisplayScalingFactor,
      nutrition.nutritionRows,
      nutrition.recipeForScaledNutrition,
      nutrition.servingScalingFactor,
      originalRecipeIngredientById,
      recipe,
      scaling,
      selectedInstructionFamilyMemberId,
      ungroupedIngredients,
      availableLogDateKeys,
      visibleGroupedIngredients,
    ],
  );

  return <RecipePageContext.Provider value={value}>{children}</RecipePageContext.Provider>;
}

function useRecipePageContext() {
  const context = useContext(RecipePageContext);
  if (!context) {
    throw new Error("useRecipePageContext must be used inside RecipePageProvider");
  }
  return context;
}

export function useRecipePageHeaderData() {
  const { recipe } = useRecipePageContext();
  return { recipe };
}

export function useRecipePageBaseData() {
  const { recipe, ingredients, familyMembers } = useRecipePageContext();
  return { recipe, ingredients, familyMembers };
}

export function useRecipePageNutritionSectionData() {
  const {
    currentServings,
    calorieTarget,
    nutritionRows,
    onCaloriesChange,
    hasActiveNutritionScaling,
    onNutritionReset,
  } = useRecipePageContext();
  return {
    currentServings,
    calorieTarget,
    nutritionRows,
    onCaloriesChange,
    hasActiveNutritionScaling,
    onNutritionReset,
  };
}

export function useRecipePageInstructionsSectionData() {
  const {
    recipe,
    familyMembers,
    effectiveRecipeIngredientById,
    selectedInstructionFamilyMemberId,
    setSelectedInstructionFamilyMemberId,
    selectedUnits,
    getIngredientDisplayScalingFactor,
    getIngredientCalorieFactor,
  } = useRecipePageContext();

  return {
    instructions: recipe.instructions,
    familyMembers,
    recipeServings: recipe.servings,
    audienceMemberIds: familyMembers.map((member) => member.id),
    memberPortions: [] as RecipeType["memberPortions"],
    effectiveRecipeIngredientById,
    selectedInstructionFamilyMemberId,
    setSelectedInstructionFamilyMemberId,
    selectedUnits,
    getIngredientDisplayScalingFactor,
    getIngredientCalorieFactor,
  };
}

export function useRecipePageIngredientsSectionData() {
  const {
    recipe,
    ingredients,
    familyMembers,
    currentServings,
    hasActiveScaling,
    localScaleByIngredientId,
    selectedUnits,
    ungroupedIngredients,
    visibleGroupedIngredients,
    onReset,
    onServingsChange,
    onUnitChange,
    getIngredientDisplayScalingFactor,
    getIngredientCalorieFactor,
    onAmountEdit,
    onApplyScaleToAll,
    onIngredientChange,
  } = useRecipePageContext();

  return {
    recipe,
    ingredients,
    familyMembers,
    currentServings,
    hasActiveScaling,
    localScaleByIngredientId,
    selectedUnits,
    ungroupedIngredients,
    visibleGroupedIngredients,
    onReset,
    onServingsChange,
    onUnitChange,
    getIngredientDisplayScalingFactor,
    getIngredientCalorieFactor,
    onAmountEdit,
    onApplyScaleToAll,
    onIngredientChange,
  };
}

export function useRecipePageAddToLogData() {
  const {
    recipe,
    familyMembers,
    currentServings,
    recipeForScaledNutrition,
    servingScalingFactor,
    availableLogDateKeys,
  } = useRecipePageContext();

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    recipeIngredients: recipeForScaledNutrition.ingredients,
    familyMembers,
    audienceMemberIds: familyMembers.map((member) => member.id),
    memberPortions: [] as RecipeType["memberPortions"],
    currentServings,
    servingScalingFactor,
    availableLogDateKeys,
  };
}
