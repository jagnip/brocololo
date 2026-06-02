"use client";

import { useCallback, useMemo } from "react";
import { RecipeType } from "@/types/recipe";
import {
  calculateNutritionPerServing,
  calculateServingScalingFactor,
  getCalorieScalingFactorForIngredient,
} from "@/lib/recipes/helpers";
import type { FamilyMemberRow } from "@/lib/db/family-members";

type UseRecipeNutritionParams = {
  recipe: RecipeType;
  effectiveRecipe: RecipeType;
  currentServings: number;
  targetCaloriesPerPortion: number | null;
  globalScaleRatio: number;
  localScaleByIngredientId: Record<string, number>;
  familyMembers: FamilyMemberRow[];
};

export type UseRecipeNutritionResult = {
  recipeForScaledNutrition: RecipeType;
  effectiveRecipeIngredientById: Map<string, RecipeType["ingredients"][number]>;
  nutritionRows: Array<{
    familyMemberId: string;
    label: string;
    nutrition: ReturnType<typeof calculateNutritionPerServing>;
  }>;
  servingScalingFactor: number;
  calorieScalingFactor: number;
  getIngredientCalorieFactor: (
    recipeIngredient: Pick<
      RecipeType["ingredients"][number],
      "appliesToEveryone" | "memberTargets"
    >,
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
  familyMembers,
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

  const selfMember = familyMembers.find((member) => member.isSelf) ?? familyMembers[0];
  const selfFamilyMemberId = selfMember?.id ?? "";
  const selfBaseNutrition = calculateNutritionPerServing(
    effectiveRecipe,
    selfFamilyMemberId,
    familyMembers,
  );
  const calorieScalingFactor =
    targetCaloriesPerPortion && selfBaseNutrition.calories > 0
      ? targetCaloriesPerPortion / selfBaseNutrition.calories
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
        const calorieFactor = getCalorieScalingFactorForIngredient(
          ingredientRow.appliesToEveryone,
          ingredientRow.memberTargets.map((target) => target.familyMemberId),
          selfFamilyMemberId,
          calorieScalingFactor,
        );
        return {
          ...ingredientRow,
          amount:
            ingredientRow.amount * globalScaleRatio * rowScaleRatio * calorieFactor,
        };
      }),
    }),
    [
      calorieScalingFactor,
      effectiveRecipe,
      globalScaleRatio,
      localScaleByIngredientId,
      selfFamilyMemberId,
    ],
  );

  const nutritionRows = familyMembers.map((member, index) => ({
    familyMemberId: member.id,
    label:
      member.name.trim() ||
      (member.isSelf ? "You" : `Family member ${index}`),
    nutrition: calculateNutritionPerServing(
      recipeForScaledNutrition,
      member.id,
      familyMembers,
    ),
  }));

  const { servingScalingFactor } = calculateServingScalingFactor(
    currentServings,
    recipe.servings,
  );

  const getIngredientCalorieFactor = useCallback(
    (
      recipeIngredient: Pick<
        RecipeType["ingredients"][number],
        "appliesToEveryone" | "memberTargets"
      >,
    ) =>
      getCalorieScalingFactorForIngredient(
        recipeIngredient.appliesToEveryone,
        recipeIngredient.memberTargets.map((target) => target.familyMemberId),
        selfFamilyMemberId,
        calorieScalingFactor,
      ),
    [calorieScalingFactor, selfFamilyMemberId],
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
    nutritionRows,
    servingScalingFactor,
    calorieScalingFactor,
    getIngredientCalorieFactor,
    getIngredientDisplayScalingFactor,
  };
}
