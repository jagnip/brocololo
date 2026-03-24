"use client";

import { useMemo } from "react";
import { IngredientType } from "@/types/ingredient";
import { RecipeType } from "@/types/recipe";
import { buildEffectiveRecipeForSimulation } from "@/lib/recipes/helpers";
import {
  useRecipeScalingState,
  type UseRecipeScalingStateResult,
} from "@/components/recipes/recipe-page/use-recipe-scaling-state";
import {
  useRecipeNutrition,
  type UseRecipeNutritionResult,
} from "@/components/recipes/recipe-page/use-recipe-nutrition";
import {
  useIngredientGrouping,
  type UseIngredientGroupingResult,
} from "@/components/recipes/recipe-page/use-ingredient-grouping";

type UseRecipeScalingParams = {
  recipe: RecipeType;
  ingredients: IngredientType[];
};

type UseRecipeScalingResult = UseRecipeScalingStateResult &
  UseRecipeNutritionResult &
  UseIngredientGroupingResult & {
    effectiveRecipe: RecipeType;
    handleIngredientChange: (
      recipeIngredientId: string,
      selectedIngredientId: string,
    ) => void;
  };

export function useRecipeScaling({ recipe, ingredients }: UseRecipeScalingParams) {
  const scaling = useRecipeScalingState({ recipe });

  // Apply swaps first, then let smaller hooks derive nutrition and grouping.
  const effectiveRecipe = useMemo(
    () =>
      buildEffectiveRecipeForSimulation(
        recipe,
        scaling.swapsByRecipeIngredientId,
        ingredients,
      ),
    [ingredients, recipe, scaling.swapsByRecipeIngredientId],
  );

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

  const nutrition = useRecipeNutrition({
    recipe,
    effectiveRecipe,
    currentServings: scaling.currentServings,
    targetCaloriesPerPortion: scaling.targetCaloriesPerPortion,
    globalScaleRatio: scaling.globalScaleRatio,
    localScaleByIngredientId: scaling.localScaleByIngredientId,
  });
  const grouping = useIngredientGrouping({
    ingredientGroups: recipe.ingredientGroups,
    ingredients: effectiveRecipe.ingredients,
  });

  const handleIngredientChange = (
    recipeIngredientId: string,
    selectedIngredientId: string,
  ) =>
    scaling.handleIngredientChange(
      recipeIngredientId,
      selectedIngredientId,
      originalRecipeIngredientById,
    );

  return {
    ...scaling,
    ...nutrition,
    ...grouping,
    effectiveRecipe,
    handleIngredientChange,
  } satisfies UseRecipeScalingResult;
}
