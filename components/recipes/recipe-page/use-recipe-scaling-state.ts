"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RecipeType } from "@/types/recipe";
import {
  IngredientSwapMap,
  applyEditRatioToLocalScale,
  computeGlobalScaleFromEditedRow,
  isScaleModified,
} from "@/lib/recipes/helpers";

type UseRecipeScalingStateParams = {
  recipe: RecipeType;
};

export type UseRecipeScalingStateResult = {
  currentServings: number;
  targetCaloriesPerPortion: number | null;
  globalScaleRatio: number;
  localScaleByIngredientId: Record<string, number>;
  swapsByRecipeIngredientId: IngredientSwapMap;
  selectedUnits: Record<string, string | null>;
  hasActiveScaling: boolean;
  setTargetCaloriesPerPortion: (value: number | null) => void;
  handleCaloriesChange: (caloriesString: string) => void;
  handleServingsChange: (newServings: number) => void;
  handleIngredientEdit: (
    recipeIngredientId: string,
    ratio: number,
    activeCalorieScalingFactor: number,
  ) => void;
  handleApplyScaleToAll: (recipeIngredientId: string) => void;
  handleReset: () => void;
  handleIngredientChange: (
    recipeIngredientId: string,
    selectedIngredientId: string,
    originalRecipeIngredientById: Map<string, RecipeType["ingredients"][number]>,
  ) => void;
  handleUnitChange: (recipeIngredientId: string, unitId: string | null) => void;
};

export function useRecipeScalingState({
  recipe,
}: UseRecipeScalingStateParams): UseRecipeScalingStateResult {
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
    (
      recipeIngredientId: string,
      selectedIngredientId: string,
      originalRecipeIngredientById: Map<string, RecipeType["ingredients"][number]>,
    ) => {
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
    [],
  );

  const handleUnitChange = useCallback(
    (recipeIngredientId: string, unitId: string | null) => {
      setSelectedUnits((prev) => ({
        ...prev,
        [recipeIngredientId]: unitId,
      }));
    },
    [],
  );

  const hasActiveScaling = useMemo(
    () =>
      globalScaleRatio !== 1 ||
      Object.keys(localScaleByIngredientId).length > 0 ||
      targetCaloriesPerPortion !== null ||
      Object.keys(swapsByRecipeIngredientId).length > 0,
    [
      globalScaleRatio,
      localScaleByIngredientId,
      swapsByRecipeIngredientId,
      targetCaloriesPerPortion,
    ],
  );

  return {
    currentServings,
    targetCaloriesPerPortion,
    globalScaleRatio,
    localScaleByIngredientId,
    swapsByRecipeIngredientId,
    selectedUnits,
    hasActiveScaling,
    setTargetCaloriesPerPortion,
    handleCaloriesChange,
    handleServingsChange,
    handleIngredientEdit,
    handleApplyScaleToAll,
    handleReset,
    handleIngredientChange,
    handleUnitChange,
  };
}
