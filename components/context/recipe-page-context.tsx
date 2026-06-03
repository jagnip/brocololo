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
import { useRecipeScalingState } from "@/components/recipes/recipe-page/use-recipe-scaling-state";
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
  targetCaloriesPerPortion: number | null;
  nutritionRows: ReturnType<typeof useRecipeNutrition>["nutritionRows"];
  onCaloriesChange: (value: string) => void;
  effectiveRecipeIngredientById: Map<string, RecipeType["ingredients"][number]>;
  selectedUnits: Record<string, string | null>;
  getIngredientDisplayScalingFactor: (recipeIngredientId: string) => number;
  getIngredientCalorieFactor: (
    recipeIngredient: Pick<
      RecipeType["ingredients"][number],
      "appliesToEveryone" | "memberTargets"
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
  const recipeAudienceFamilyMembers = useMemo(() => {
    const audienceIds = new Set(
      recipe.audienceMembers.map((member) => member.familyMemberId),
    );
    return familyMembers.filter((member) => audienceIds.has(member.id));
  }, [familyMembers, recipe.audienceMembers]);

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
    currentServings: scaling.currentServings,
    targetCaloriesPerPortion: scaling.targetCaloriesPerPortion,
    globalScaleRatio: scaling.globalScaleRatio,
    localScaleByIngredientId: scaling.localScaleByIngredientId,
    familyMembers: recipeAudienceFamilyMembers,
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
      familyMembers: recipeAudienceFamilyMembers,
      selectedInstructionFamilyMemberId,
      setSelectedInstructionFamilyMemberId,
      currentServings: scaling.currentServings,
      targetCaloriesPerPortion: scaling.targetCaloriesPerPortion,
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
      // Keep ingredient swap logic centralized so sections don't know about origin maps.
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
      recipeAudienceFamilyMembers,
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
    targetCaloriesPerPortion,
    nutritionRows,
    onCaloriesChange,
    hasActiveNutritionScaling,
    onNutritionReset,
  } = useRecipePageContext();
  return {
    currentServings,
    targetCaloriesPerPortion,
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
    currentServings,
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
    currentServings,
    audienceMembers: recipe.audienceMembers,
    memberPortions: recipe.memberPortions,
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
    audienceMembers: recipe.audienceMembers,
    memberPortions: recipe.memberPortions,
    currentServings,
    servingScalingFactor,
    availableLogDateKeys,
  };
}
