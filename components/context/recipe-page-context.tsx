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

type RecipePageProviderProps = {
  recipe: RecipeType;
  ingredients: IngredientType[];
  children: ReactNode;
};

type RecipePageContextValue = {
  recipe: RecipeType;
  ingredients: IngredientType[];
  selectedInstructionPerson: "jagoda" | "nelson" | null;
  setSelectedInstructionPerson: Dispatch<SetStateAction<"jagoda" | "nelson" | null>>;
  currentServings: number;
  targetCaloriesPerPortion: number | null;
  jagodaNutrition: ReturnType<typeof useRecipeNutrition>["jagodaNutrition"];
  nelsonNutrition: ReturnType<typeof useRecipeNutrition>["nelsonNutrition"];
  onCaloriesChange: (value: string) => void;
  effectiveRecipeIngredientById: Map<string, RecipeType["ingredients"][number]>;
  selectedUnits: Record<string, string | null>;
  jagodaPortionFactor: number;
  nelsonPortionFactor: number;
  getIngredientDisplayScalingFactor: (recipeIngredientId: string) => number;
  getIngredientCalorieFactor: (
    nutritionTarget: "BOTH" | "PRIMARY_ONLY" | "SECONDARY_ONLY",
  ) => number;
  hasActiveScaling: boolean;
  localScaleByIngredientId: Record<string, number>;
  ungroupedIngredients: RecipeType["ingredients"];
  visibleGroupedIngredients: Array<
    RecipeType["ingredientGroups"][number] & {
      ingredients: RecipeType["ingredients"];
    }
  >;
  onReset: () => void;
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
};

const RecipePageContext = createContext<RecipePageContextValue | null>(null);

export function RecipePageProvider({
  recipe,
  ingredients,
  children,
}: RecipePageProviderProps) {
  const [selectedInstructionPerson, setSelectedInstructionPerson] = useState<
    "jagoda" | "nelson" | null
  >(null);
  const scaling = useRecipeScalingState({ recipe });

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
      selectedInstructionPerson,
      setSelectedInstructionPerson,
      currentServings: scaling.currentServings,
      targetCaloriesPerPortion: scaling.targetCaloriesPerPortion,
      jagodaNutrition: nutrition.jagodaNutrition,
      nelsonNutrition: nutrition.nelsonNutrition,
      onCaloriesChange: scaling.handleCaloriesChange,
      effectiveRecipeIngredientById: nutrition.effectiveRecipeIngredientById,
      selectedUnits: scaling.selectedUnits,
      jagodaPortionFactor: nutrition.jagodaPortionFactor,
      nelsonPortionFactor: nutrition.nelsonPortionFactor,
      getIngredientDisplayScalingFactor: nutrition.getIngredientDisplayScalingFactor,
      getIngredientCalorieFactor: nutrition.getIngredientCalorieFactor,
      hasActiveScaling: scaling.hasActiveScaling,
      localScaleByIngredientId: scaling.localScaleByIngredientId,
      ungroupedIngredients,
      visibleGroupedIngredients,
      onReset: scaling.handleReset,
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
    }),
    [
      ingredients,
      nutrition.effectiveRecipeIngredientById,
      nutrition.getIngredientCalorieFactor,
      nutrition.getIngredientDisplayScalingFactor,
      nutrition.jagodaNutrition,
      nutrition.jagodaPortionFactor,
      nutrition.nelsonNutrition,
      nutrition.nelsonPortionFactor,
      nutrition.recipeForScaledNutrition,
      nutrition.servingScalingFactor,
      originalRecipeIngredientById,
      recipe,
      scaling.currentServings,
      scaling.handleApplyScaleToAll,
      scaling.handleCaloriesChange,
      scaling.handleIngredientEdit,
      scaling.handleIngredientChange,
      scaling.handleReset,
      scaling.handleServingsChange,
      scaling.handleUnitChange,
      scaling.hasActiveScaling,
      scaling.localScaleByIngredientId,
      scaling.selectedUnits,
      scaling.targetCaloriesPerPortion,
      selectedInstructionPerson,
      ungroupedIngredients,
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

export function useRecipePageNutritionSectionData() {
  const {
    currentServings,
    targetCaloriesPerPortion,
    jagodaNutrition,
    nelsonNutrition,
    onCaloriesChange,
  } = useRecipePageContext();
  return {
    currentServings,
    targetCaloriesPerPortion,
    jagodaNutrition,
    nelsonNutrition,
    onCaloriesChange,
  };
}

export function useRecipePageInstructionsSectionData() {
  const {
    recipe,
    effectiveRecipeIngredientById,
    selectedInstructionPerson,
    setSelectedInstructionPerson,
    selectedUnits,
    jagodaPortionFactor,
    nelsonPortionFactor,
    getIngredientDisplayScalingFactor,
    getIngredientCalorieFactor,
  } = useRecipePageContext();

  return {
    instructions: recipe.instructions,
    effectiveRecipeIngredientById,
    selectedInstructionPerson,
    setSelectedInstructionPerson,
    selectedUnits,
    jagodaPortionFactor,
    nelsonPortionFactor,
    getIngredientDisplayScalingFactor,
    getIngredientCalorieFactor,
  };
}

export function useRecipePageIngredientsSectionData() {
  const {
    recipe,
    ingredients,
    currentServings,
    jagodaPortionFactor,
    nelsonPortionFactor,
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
    currentServings,
    jagodaPortionFactor,
    nelsonPortionFactor,
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
  const { recipe, currentServings, recipeForScaledNutrition, servingScalingFactor } =
    useRecipePageContext();

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    recipeIngredients: recipeForScaledNutrition.ingredients,
    currentServings,
    servingScalingFactor,
    servingMultiplierForNelson: recipe.servingMultiplierForNelson,
  };
}
