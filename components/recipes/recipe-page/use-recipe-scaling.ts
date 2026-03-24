"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IngredientType } from "@/types/ingredient";
import { RecipeType } from "@/types/recipe";
import {
  IngredientSwapMap,
  applyEditRatioToLocalScale,
  buildEffectiveRecipeForSimulation,
  calculateNutritionPerServing,
  calculateServingScalingFactor,
  computeGlobalScaleFromEditedRow,
  getPrimaryCalorieScalingFactorForTarget,
  isScaleModified,
} from "@/lib/recipes/helpers";

type UseRecipeScalingParams = {
  recipe: RecipeType;
  ingredients: IngredientType[];
};

export function useRecipeScaling({ recipe, ingredients }: UseRecipeScalingParams) {
  const [currentServings, setCurrentServings] = useState(recipe.servings);
  const [targetCaloriesPerPortion, setTargetCaloriesPerPortion] = useState<
    number | null
  >(null);
  const [globalScaleRatio, setGlobalScaleRatio] = useState(1);
  const [localScaleByIngredientId, setLocalScaleByIngredientId] = useState<
    Record<string, number>
  >({});
  const [swapsByRecipeIngredientId, setSwapsByRecipeIngredientId] =
    useState<IngredientSwapMap>({});
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string | null>>(
    {},
  );

  // Reset scaling state when navigating to a different recipe.
  useEffect(() => {
    setCurrentServings(recipe.servings);
    setTargetCaloriesPerPortion(null);
    setGlobalScaleRatio(1);
    setLocalScaleByIngredientId({});
    setSwapsByRecipeIngredientId({});
    setSelectedUnits({});
  }, [recipe.id, recipe.servings]);

  const effectiveRecipe = useMemo(
    () =>
      buildEffectiveRecipeForSimulation(
        recipe,
        swapsByRecipeIngredientId,
        ingredients,
      ),
    [recipe, swapsByRecipeIngredientId, ingredients],
  );

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

  const handleCaloriesChange = useCallback((caloriesString: string) => {
    const calories = parseFloat(caloriesString);

    if (isNaN(calories) || calories <= 0) {
      setTargetCaloriesPerPortion(null);
      return;
    }

    // Keep calorie target mode deterministic by clearing row/global edits.
    setGlobalScaleRatio(1);
    setLocalScaleByIngredientId({});
    setTargetCaloriesPerPortion(calories);
  }, []);

  const handleServingsChange = useCallback((newServings: number) => {
    setCurrentServings(newServings);
    // Serving changes restart from base amounts to avoid compounded state.
    setGlobalScaleRatio(1);
    setLocalScaleByIngredientId({});
  }, []);

  const handleIngredientEdit = useCallback(
    (recipeIngredientId: string, ratio: number, activeCalorieScalingFactor: number) => {
      // Default behavior: edit only the touched row, not the entire recipe.
      setLocalScaleByIngredientId((prev) => {
        const currentLocalScale = prev[recipeIngredientId] ?? 1;
        const nextLocalScale = applyEditRatioToLocalScale(
          currentLocalScale,
          ratio,
          activeCalorieScalingFactor,
        );
        const next = { ...prev };
        if (isScaleModified(nextLocalScale)) {
          next[recipeIngredientId] = nextLocalScale;
        } else {
          delete next[recipeIngredientId];
        }
        return next;
      });
      setTargetCaloriesPerPortion(null);
    },
    [],
  );

  const handleApplyScaleToAll = useCallback(
    (recipeIngredientId: string) => {
      // One-time global apply: use clicked row as source-of-truth, then clear row deltas.
      setGlobalScaleRatio((prevGlobalScale) => {
        const rowLocalScale = localScaleByIngredientId[recipeIngredientId] ?? 1;
        return computeGlobalScaleFromEditedRow(prevGlobalScale, rowLocalScale);
      });
      setLocalScaleByIngredientId({});
    },
    [localScaleByIngredientId],
  );

  const handleReset = useCallback(() => {
    setGlobalScaleRatio(1);
    setLocalScaleByIngredientId({});
    setTargetCaloriesPerPortion(null);
    setSwapsByRecipeIngredientId({});
    setSelectedUnits({});
  }, []);

  const handleIngredientChange = useCallback(
    (recipeIngredientId: string, selectedIngredientId: string) => {
      const originalRecipeIngredient = originalRecipeIngredientById.get(recipeIngredientId);
      if (!originalRecipeIngredient) {
        return;
      }

      setSwapsByRecipeIngredientId((prev) => {
        const next = { ...prev };

        if (selectedIngredientId === originalRecipeIngredient.ingredient.id) {
          delete next[recipeIngredientId];
          return next;
        }

        next[recipeIngredientId] = selectedIngredientId;
        return next;
      });

      // Reset unit selection for this row after a swap to avoid stale unit IDs.
      setSelectedUnits((prev) => {
        const next = { ...prev };
        delete next[recipeIngredientId];
        return next;
      });
      // Clear row-local edits for swapped rows to avoid stale ratio assumptions.
      setLocalScaleByIngredientId((prev) => {
        const next = { ...prev };
        delete next[recipeIngredientId];
        return next;
      });
    },
    [originalRecipeIngredientById],
  );

  const handleUnitChange: (recipeIngredientId: string, unitId: string | null) => void =
    useCallback(
    (recipeIngredientId: string, unitId: string | null) => {
      setSelectedUnits((prev) => ({
        ...prev,
        [recipeIngredientId]: unitId,
      }));
    },
    [],
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

  const hasActiveScaling =
    globalScaleRatio !== 1 ||
    Object.keys(localScaleByIngredientId).length > 0 ||
    targetCaloriesPerPortion !== null ||
    Object.keys(swapsByRecipeIngredientId).length > 0;

  const orderedIngredientGroups = useMemo(
    () => [...recipe.ingredientGroups].sort((a, b) => a.position - b.position),
    [recipe.ingredientGroups],
  );
  const ungroupedIngredients = useMemo(
    () =>
      effectiveRecipe.ingredients
        .filter((ingredient) => ingredient.groupId == null)
        .sort((a, b) => a.position - b.position),
    [effectiveRecipe.ingredients],
  );
  const groupedIngredients = useMemo(
    () =>
      orderedIngredientGroups.map((group) => ({
        ...group,
        ingredients: effectiveRecipe.ingredients
          .filter((ingredient) => ingredient.groupId === group.id)
          .sort((a, b) => a.position - b.position),
      })),
    [effectiveRecipe.ingredients, orderedIngredientGroups],
  );
  // Hide empty groups on detail page to keep sections focused on actual items.
  const visibleGroupedIngredients = useMemo(
    () => groupedIngredients.filter((group) => group.ingredients.length > 0),
    [groupedIngredients],
  );

  return {
    currentServings,
    targetCaloriesPerPortion,
    localScaleByIngredientId,
    selectedUnits,
    effectiveRecipe,
    effectiveRecipeIngredientById,
    recipeForScaledNutrition,
    jagodaNutrition,
    nelsonNutrition,
    servingScalingFactor,
    jagodaPortionFactor,
    nelsonPortionFactor,
    hasActiveScaling,
    ungroupedIngredients,
    visibleGroupedIngredients,
    handleCaloriesChange,
    handleServingsChange,
    handleIngredientEdit,
    handleApplyScaleToAll,
    handleReset,
    handleIngredientChange,
    handleUnitChange,
    getIngredientCalorieFactor,
    getIngredientDisplayScalingFactor,
  };
}
