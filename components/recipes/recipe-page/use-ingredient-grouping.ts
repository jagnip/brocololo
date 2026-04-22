"use client";

import { useMemo } from "react";
import { RecipeType } from "@/types/recipe";

type UseIngredientGroupingParams = {
  ingredientGroups: RecipeType["ingredientGroups"];
  ingredients: RecipeType["ingredients"];
};

export type UseIngredientGroupingResult = {
  ungroupedIngredients: RecipeType["ingredients"];
  visibleGroupedIngredients: Array<
    RecipeType["ingredientGroups"][number] & {
      ingredients: RecipeType["ingredients"];
    }
  >;
};

export function useIngredientGrouping({
  ingredientGroups,
  ingredients,
}: UseIngredientGroupingParams): UseIngredientGroupingResult {
  const orderedIngredientGroups = useMemo(
    () => [...ingredientGroups].sort((a, b) => a.position - b.position),
    [ingredientGroups],
  );
  const ungroupedIngredients = useMemo(
    () =>
      ingredients
        .filter((ingredient) => ingredient.groupId == null)
        .sort((a, b) => a.position - b.position),
    [ingredients],
  );
  const groupedIngredients = useMemo(
    () =>
      orderedIngredientGroups.map((group) => ({
        ...group,
        ingredients: ingredients
          .filter((ingredient) => ingredient.groupId === group.id)
          .sort((a, b) => a.position - b.position),
      })),
    [ingredients, orderedIngredientGroups],
  );
  // Keep group headers visible even when currently empty.
  const visibleGroupedIngredients = useMemo(
    () => groupedIngredients,
    [groupedIngredients],
  );

  return {
    ungroupedIngredients,
    visibleGroupedIngredients,
  };
}
