"use client";

import { useCallback, useMemo } from "react";
import { RecipeType } from "@/types/recipe";
import {
  calculateNutritionPerServing,
  calculateServingScalingFactor,
  getPrimaryCalorieScalingFactorForTarget,
} from "@/lib/recipes/helpers";

type UseRecipeNutritionParams = {
  recipe: RecipeType;
  effectiveRecipe: RecipeType;
  currentServings: number;
  targetCaloriesPerPortion: number | null;
  globalScaleRatio: number;
  localScaleByIngredientId: Record<string, number>;
};

export type UseRecipeNutritionResult = {
  recipeForScaledNutrition: RecipeType;
  effectiveRecipeIngredientById: Map<string, RecipeType["ingredients"][number]>;
  jagodaNutrition: ReturnType<typeof calculateNutritionPerServing>;
  nelsonNutrition: ReturnType<typeof calculateNutritionPerServing>;
  servingScalingFactor: number;
  jagodaPortionFactor: number;
  nelsonPortionFactor: number;
  calorieScalingFactor: number;
  getIngredientCalorieFactor: (
    nutritionTarget: "BOTH" | "PRIMARY_ONLY" | "SECONDARY_ONLY",
  ) => number;
  getIngredientDisplayScalingFactor: (recipeIngredientId: string) => number;
};

export function useRecipeNutrition({
  recipe,
  effectiveRecipe,
  currentServings,
  targetCaloriesPerPortion,
  globalScaleRatio,
  localScaleByIngredientId,
}: UseRecipeNutritionParams): UseRecipeNutritionResult {
  const effectiveRecipeIngredientById = useMemo(
    () =>
      new Map(
        effectiveRecipe.ingredients.map((recipeIngredient) => [
          recipeIngredient.id,
          recipeIngredient,
        ]),
      ),
    [effectiveRecipe.ingredients],
  );

  const jagodaBaseNutrition = calculateNutritionPerServing(effectiveRecipe, "primary");
  const calorieScalingFactor =
    targetCaloriesPerPortion && jagodaBaseNutrition.calories > 0
      ? targetCaloriesPerPortion / jagodaBaseNutrition.calories
      : 1;

  const recipeForScaledNutrition = useMemo(
    () => ({
      ...effectiveRecipe,
      ingredients: effectiveRecipe.ingredients.map((ingredientRow) => {
        if (ingredientRow.amount == null) {
          return ingredientRow;
        }
        // Compose base-anchored global + per-row local scales for nutrition math.
        const rowScaleRatio = localScaleByIngredientId[ingredientRow.id] ?? 1;
        const calorieFactor = getPrimaryCalorieScalingFactorForTarget(
          ingredientRow.nutritionTarget,
          calorieScalingFactor,
        );
        return {
          ...ingredientRow,
          amount:
            ingredientRow.amount * globalScaleRatio * rowScaleRatio * calorieFactor,
        };
      }),
    }),
    [calorieScalingFactor, effectiveRecipe, globalScaleRatio, localScaleByIngredientId],
  );

  const jagodaNutrition = calculateNutritionPerServing(recipeForScaledNutrition, "primary");
  const nelsonNutrition = calculateNutritionPerServing(
    recipeForScaledNutrition,
    "secondary",
  );

  const { servingScalingFactor, jagodaPortionFactor, nelsonPortionFactor } =
    calculateServingScalingFactor(
      currentServings,
      recipe.servings,
      recipe.servingMultiplierForNelson,
    );

  const getIngredientCalorieFactor = useCallback(
    (nutritionTarget: "BOTH" | "PRIMARY_ONLY" | "SECONDARY_ONLY") =>
      getPrimaryCalorieScalingFactorForTarget(nutritionTarget, calorieScalingFactor),
    [calorieScalingFactor],
  );

  const getIngredientDisplayScalingFactor = useCallback(
    (recipeIngredientId: string) =>
      servingScalingFactor *
      globalScaleRatio *
      (localScaleByIngredientId[recipeIngredientId] ?? 1),
    [globalScaleRatio, localScaleByIngredientId, servingScalingFactor],
  );

  return {
    recipeForScaledNutrition,
    effectiveRecipeIngredientById,
    jagodaNutrition,
    nelsonNutrition,
    servingScalingFactor,
    jagodaPortionFactor,
    nelsonPortionFactor,
    calorieScalingFactor,
    getIngredientCalorieFactor,
    getIngredientDisplayScalingFactor,
  };
}
