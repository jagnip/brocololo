"use client";

import { useCallback, useMemo } from "react";
import { RecipeType } from "@/types/recipe";
import {
  calculateNutritionPerServing,
  getCalorieScalingFactorForIngredient,
} from "@/lib/recipes/helpers";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import type { IngredientType } from "@/types/ingredient";
import type { CalorieTarget } from "@/components/recipes/recipe-page/use-recipe-scaling-state";

type UseRecipeNutritionParams = {
  recipe: RecipeType;
  effectiveRecipe: RecipeType;
  ingredientCatalog: IngredientType[];
  cookingFamilyMemberIds: string[];
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
  /** Manual scale factor applied on top of resolved per-person amounts (excludes mealCount). */
  mealBatchScaleFactor: number;
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
  ingredientCatalog,
  cookingFamilyMemberIds,
  calorieTarget,
  globalScaleRatio,
  localScaleByIngredientId,
  familyMembers,
}: UseRecipeNutritionParams): UseRecipeNutritionResult {
  const audienceMemberIds = useMemo(
    () => familyMembers.map((member) => member.id),
    [familyMembers],
  );

  const cookingAudienceMembers = useMemo(() => {
    const cookingIdSet = new Set(cookingFamilyMemberIds);
    return familyMembers.filter((member) => cookingIdSet.has(member.id));
  }, [cookingFamilyMemberIds, familyMembers]);

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
    cookingAudienceMembers.find((member) => member.isSelf) ??
    cookingAudienceMembers[0];
  const selfFamilyMemberId = selfMember?.id ?? "";
  const anchorMemberId = calorieTarget?.familyMemberId ?? selfFamilyMemberId;
  const anchorBaseNutrition = calculateNutritionPerServing(
    effectiveRecipe,
    anchorMemberId,
    cookingAudienceMembers,
    ingredientCatalog,
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
        // Compose global + per-row local scales for log prefill and nutrition math.
        const rowScaleRatio = localScaleByIngredientId[ingredientRow.id] ?? 1;
        const calorieFactor = getCalorieScalingFactorForIngredient(
          ingredientRow.memberAdjustments,
          audienceMemberIds,
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
      audienceMemberIds,
      calorieScalingFactor,
      effectiveRecipe,
      globalScaleRatio,
      localScaleByIngredientId,
    ],
  );

  const nutritionRows = cookingAudienceMembers.map((member, index) => ({
    familyMemberId: member.id,
    label:
      member.name.trim() ||
      (member.isSelf ? "You" : `Family member ${index}`),
    nutrition: calculateNutritionPerServing(
      recipeForScaledNutrition,
      member.id,
      cookingAudienceMembers,
      ingredientCatalog,
    ),
  }));

  const getIngredientCalorieFactor = useCallback(
    (
      recipeIngredient: Pick<
        RecipeType["ingredients"][number],
        "memberAdjustments"
      >,
    ) =>
      getCalorieScalingFactorForIngredient(
        recipeIngredient.memberAdjustments,
        audienceMemberIds,
        anchorMemberId,
        calorieScalingFactor,
      ),
    [anchorMemberId, audienceMemberIds, calorieScalingFactor],
  );

  const getIngredientDisplayScalingFactor = useCallback(
    (recipeIngredientId: string) =>
      globalScaleRatio * (localScaleByIngredientId[recipeIngredientId] ?? 1),
    [globalScaleRatio, localScaleByIngredientId],
  );

  return {
    recipeForScaledNutrition,
    effectiveRecipeIngredientById,
    nutritionRows,
    mealBatchScaleFactor: 1,
    calorieScalingFactor,
    getIngredientCalorieFactor,
    getIngredientDisplayScalingFactor,
  };
}
