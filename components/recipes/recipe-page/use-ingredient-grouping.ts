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
  // Hide empty groups on detail page to keep sections focused on actual items.
  const visibleGroupedIngredients = useMemo(
    () => groupedIngredients.filter((group) => group.ingredients.length > 0),
    [groupedIngredients],
  );

  return {
    ungroupedIngredients,
    visibleGroupedIngredients,
  };
}
