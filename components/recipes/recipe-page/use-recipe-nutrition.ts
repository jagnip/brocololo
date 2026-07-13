"use client";

import { useCallback, useMemo } from "react";
import { RecipeType } from "@/types/recipe";
import {
  calculateNutritionPerServing,
  calculateServingScalingFactor,
  getCalorieScalingFactorForIngredient,
} from "@/lib/recipes/helpers";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import type { CalorieTarget } from "@/components/recipes/recipe-page/use-recipe-scaling-state";

type UseRecipeNutritionParams = {
  recipe: RecipeType;
  effectiveRecipe: RecipeType;
  currentServings: number;
  calorieTarget: CalorieTarget | null;
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
      "memberAdjustments"
    >,
  ) => number;
  getIngredientDisplayScalingFactor: (recipeIngredientId: string) => number;
};

export function useRecipeNutrition({
  recipe,
  effectiveRecipe,
  currentServings,
  calorieTarget,
  globalScaleRatio,
  localScaleByIngredientId,
  familyMembers,
}: UseRecipeNutritionParams): UseRecipeNutritionResult {
  const recipeAudienceIdSet = useMemo(
    () =>
      new Set(recipe.audienceMembers.map((member) => member.familyMemberId)),
    [recipe.audienceMembers],
  );
  const recipeAudienceMembers = useMemo(
    () => familyMembers.filter((member) => recipeAudienceIdSet.has(member.id)),
    [familyMembers, recipeAudienceIdSet],
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

  const selfMember =
    recipeAudienceMembers.find((member) => member.isSelf) ??
    recipeAudienceMembers[0];
  const selfFamilyMemberId = selfMember?.id ?? "";
  const anchorMemberId = calorieTarget?.familyMemberId ?? selfFamilyMemberId;
  const anchorBaseNutrition = calculateNutritionPerServing(
    effectiveRecipe,
    anchorMemberId,
    recipeAudienceMembers,
  );
  const calorieScalingFactor =
    calorieTarget && anchorBaseNutrition.calories > 0
      ? calorieTarget.calories / anchorBaseNutrition.calories
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
          ingredientRow.memberAdjustments,
          recipe.audienceMembers.map((member) => member.familyMemberId),
          anchorMemberId,
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
      anchorMemberId,
      calorieScalingFactor,
      effectiveRecipe,
      globalScaleRatio,
      localScaleByIngredientId,
    ],
  );

  const nutritionRows = recipeAudienceMembers.map((member, index) => ({
    familyMemberId: member.id,
    label:
      member.name.trim() ||
      (member.isSelf ? "You" : `Family member ${index}`),
    nutrition: calculateNutritionPerServing(
      recipeForScaledNutrition,
      member.id,
      recipeAudienceMembers,
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
        "memberAdjustments"
      >,
    ) =>
      getCalorieScalingFactorForIngredient(
        recipeIngredient.memberAdjustments,
        recipe.audienceMembers.map((member) => member.familyMemberId),
        anchorMemberId,
        calorieScalingFactor,
      ),
    [anchorMemberId, calorieScalingFactor, recipe.audienceMembers],
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
