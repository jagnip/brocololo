"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { IngredientType } from "@/types/ingredient";
import type { RecipeType } from "@/types/recipe";
import { buildEffectiveRecipeForSimulation } from "@/lib/recipes/helpers";
import {
  useRecipeScalingState,
  type CalorieTarget,
} from "@/components/recipes/recipe-page/use-recipe-scaling-state";
import { useRecipeNutrition } from "@/components/recipes/recipe-page/use-recipe-nutrition";
import { useIngredientGrouping } from "@/components/recipes/recipe-page/use-ingredient-grouping";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import {
  normalizeMemberPortions,
  type MemberPortionInput,
} from "@/lib/recipes/ingredient-adjustments";
import {
  resolveCookingAggregatedLines,
  type CookingAggregatedLine,
} from "@/lib/recipes/resolve-cooking-display-lines";

type RecipePageProviderProps = {
  recipe: RecipeType;
  ingredients: IngredientType[];
  familyMembers: FamilyMemberRow[];
  availableLogDateKeys: string[];
  children: ReactNode;
};

type RecipePageContextValue = {
  recipe: RecipeType;
  ingredients: IngredientType[];
  familyMembers: FamilyMemberRow[];
  mealCount: number;
  onMealCountChange: (nextCount: number) => void;
  cookingFamilyMemberIds: string[];
  onCookingFamilyMemberIdsChange: (nextIds: string[]) => void;
  audienceMemberIds: string[];
  memberPortions: MemberPortionInput[];
  calorieTarget: CalorieTarget | null;
  nutritionRows: ReturnType<typeof useRecipeNutrition>["nutritionRows"];
  onCaloriesChange: (familyMemberId: string, value: string) => void;
  effectiveRecipeIngredientById: Map<string, RecipeType["ingredients"][number]>;
  selectedUnits: Record<string, string | null>;
  getIngredientDisplayScalingFactor: (recipeIngredientId: string) => number;
  getIngredientCalorieFactor: (
    recipeIngredient: Pick<
      RecipeType["ingredients"][number],
      "memberAdjustments"
    >,
  ) => number;
  hasActiveScaling: boolean;
  hasActiveNutritionScaling: boolean;
  localScaleByIngredientId: Record<string, number>;
  ungroupedIngredients: RecipeType["ingredients"];
  visibleGroupedIngredients: Array<
    RecipeType["ingredientGroups"][number] & {
      ingredients: RecipeType["ingredients"];
    }
  >;
  cookingAggregatedUngrouped: CookingAggregatedLine[];
  cookingAggregatedByGroupId: Map<string, CookingAggregatedLine[]>;
  onReset: () => void;
  onNutritionReset: () => void;
  onUnitChange: (recipeIngredientId: string, unitId: string | null) => void;
  onAmountEdit: (
    recipeIngredientId: string,
    ratio: number,
    activeCalorieScalingFactor: number,
  ) => void;
  onAggregatedAmountEdit: (
    sourceRecipeIngredientIds: string[],
    ratio: number,
    activeCalorieScalingFactor: number,
  ) => void;
  onApplyScaleToAll: (recipeIngredientId: string) => void;
  onIngredientChange: (recipeIngredientId: string, ingredientId: string) => void;
  recipeForScaledNutrition: RecipeType;
  mealBatchScaleFactor: number;
  availableLogDateKeys: string[];
};

const RecipePageContext = createContext<RecipePageContextValue | null>(null);

export function RecipePageProvider({
  recipe,
  ingredients,
  familyMembers,
  availableLogDateKeys,
  children,
}: RecipePageProviderProps) {
  const [cookingFamilyMemberIds, setCookingFamilyMemberIds] = useState<string[]>(
    () => familyMembers.map((member) => member.id),
  );

  const scaling = useRecipeScalingState({ recipe });

  const audienceMemberIds = useMemo(
    () => familyMembers.map((member) => member.id),
    [familyMembers],
  );
  const memberPortions = useMemo(
    () =>
      normalizeMemberPortions(
        familyMembers,
        recipe.memberPortions.map((portion) => ({
          familyMemberId: portion.familyMemberId,
          multiplier: portion.multiplier,
        })),
      ),
    [familyMembers, recipe.memberPortions],
  );

  useEffect(() => {
    setCookingFamilyMemberIds(familyMembers.map((member) => member.id));
  }, [familyMembers, recipe.id]);

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
    ingredientCatalog: ingredients,
    cookingFamilyMemberIds,
    calorieTarget: scaling.calorieTarget,
    globalScaleRatio: scaling.globalScaleRatio,
    localScaleByIngredientId: scaling.localScaleByIngredientId,
    familyMembers,
  });

  const { ungroupedIngredients, visibleGroupedIngredients } = useIngredientGrouping({
    ingredientGroups: recipe.ingredientGroups,
    ingredients: effectiveRecipe.ingredients,
  });

  const getRowDisplayScale = useCallback(
    (recipeIngredientId: string) => {
      const row = nutrition.effectiveRecipeIngredientById.get(recipeIngredientId);
      if (!row) {
        return 1;
      }
      return (
        nutrition.getIngredientDisplayScalingFactor(recipeIngredientId) *
        nutrition.getIngredientCalorieFactor(row)
      );
    },
    [nutrition],
  );

  const aggregatedResolveBase = useMemo(
    () => ({
      recipeServings: recipe.servings,
      familyMembers,
      cookingFamilyMemberIds,
      mealCount: scaling.mealCount,
      audienceMemberIds,
      memberPortions,
      getRowDisplayScale,
    }),
    [
      audienceMemberIds,
      cookingFamilyMemberIds,
      familyMembers,
      getRowDisplayScale,
      memberPortions,
      recipe.servings,
      scaling.mealCount,
    ],
  );

  const cookingAggregatedUngrouped = useMemo(
    () =>
      resolveCookingAggregatedLines({
        recipeIngredients: ungroupedIngredients,
        ...aggregatedResolveBase,
      }),
    [aggregatedResolveBase, ungroupedIngredients],
  );

  const cookingAggregatedByGroupId = useMemo(() => {
    const byGroup = new Map<string, CookingAggregatedLine[]>();
    for (const group of visibleGroupedIngredients) {
      byGroup.set(
        group.id,
        resolveCookingAggregatedLines({
          recipeIngredients: group.ingredients,
          ...aggregatedResolveBase,
        }),
      );
    }
    return byGroup;
  }, [aggregatedResolveBase, visibleGroupedIngredients]);

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

  const handleMealCountChange = useCallback(
    (nextCount: number) => {
      scaling.handleMealCountChange(nextCount);
    },
    [scaling],
  );

  const handleAggregatedAmountEdit = useCallback(
    (
      sourceRecipeIngredientIds: string[],
      ratio: number,
      activeCalorieScalingFactor: number,
    ) => {
      for (const recipeIngredientId of sourceRecipeIngredientIds) {
        scaling.handleIngredientEdit(
          recipeIngredientId,
          ratio,
          activeCalorieScalingFactor,
        );
      }
    },
    [scaling],
  );

  const value = useMemo<RecipePageContextValue>(
    () => ({
      recipe,
      ingredients,
      familyMembers,
      mealCount: scaling.mealCount,
      onMealCountChange: handleMealCountChange,
      cookingFamilyMemberIds,
      onCookingFamilyMemberIdsChange: setCookingFamilyMemberIds,
      audienceMemberIds,
      memberPortions,
      calorieTarget: scaling.calorieTarget,
      nutritionRows: nutrition.nutritionRows,
      onCaloriesChange: scaling.handleCaloriesChange,
      effectiveRecipeIngredientById: nutrition.effectiveRecipeIngredientById,
      selectedUnits: scaling.selectedUnits,
      getIngredientDisplayScalingFactor: nutrition.getIngredientDisplayScalingFactor,
      getIngredientCalorieFactor: nutrition.getIngredientCalorieFactor,
      hasActiveScaling: scaling.hasActiveScaling,
      hasActiveNutritionScaling: scaling.hasActiveNutritionScaling,
      localScaleByIngredientId: scaling.localScaleByIngredientId,
      ungroupedIngredients,
      visibleGroupedIngredients,
      cookingAggregatedUngrouped,
      cookingAggregatedByGroupId,
      onReset: scaling.handleReset,
      onNutritionReset: scaling.handleNutritionReset,
      onUnitChange: scaling.handleUnitChange,
      onAmountEdit: scaling.handleIngredientEdit,
      onAggregatedAmountEdit: handleAggregatedAmountEdit,
      onApplyScaleToAll: scaling.handleApplyScaleToAll,
      onIngredientChange: (recipeIngredientId, ingredientId) =>
        scaling.handleIngredientChange(
          recipeIngredientId,
          ingredientId,
          originalRecipeIngredientById,
        ),
      recipeForScaledNutrition: nutrition.recipeForScaledNutrition,
      mealBatchScaleFactor: scaling.mealCount,
      availableLogDateKeys,
    }),
    [
      audienceMemberIds,
      availableLogDateKeys,
      cookingAggregatedByGroupId,
      cookingAggregatedUngrouped,
      cookingFamilyMemberIds,
      familyMembers,
      handleAggregatedAmountEdit,
      handleMealCountChange,
      ingredients,
      memberPortions,
      nutrition.effectiveRecipeIngredientById,
      nutrition.getIngredientCalorieFactor,
      nutrition.getIngredientDisplayScalingFactor,
      nutrition.nutritionRows,
      nutrition.recipeForScaledNutrition,
      originalRecipeIngredientById,
      recipe,
      scaling,
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

export function useRecipePageBaseData() {
  const { recipe, ingredients, familyMembers } = useRecipePageContext();
  return { recipe, ingredients, familyMembers };
}

export function useRecipePageCookingForData() {
  const {
    mealCount,
    onMealCountChange,
    familyMembers,
    cookingFamilyMemberIds,
    onCookingFamilyMemberIdsChange,
  } = useRecipePageContext();
  return {
    mealCount,
    onMealCountChange,
    familyMembers,
    cookingFamilyMemberIds,
    onCookingFamilyMemberIdsChange,
  };
}

export function useRecipePageNutritionSectionData() {
  const {
    calorieTarget,
    nutritionRows,
    onCaloriesChange,
    hasActiveNutritionScaling,
    onNutritionReset,
  } = useRecipePageContext();
  return {
    calorieTarget,
    nutritionRows,
    onCaloriesChange,
    hasActiveNutritionScaling,
    onNutritionReset,
  };
}

export function useRecipePageInstructionsSectionData() {
  const {
    recipe,
    familyMembers,
    cookingFamilyMemberIds,
    audienceMemberIds,
    memberPortions,
    mealCount,
    effectiveRecipeIngredientById,
    selectedUnits,
    getIngredientDisplayScalingFactor,
    getIngredientCalorieFactor,
  } = useRecipePageContext();

  const cookingMembers = useMemo(() => {
    const cookingIdSet = new Set(cookingFamilyMemberIds);
    return familyMembers.filter((member) => cookingIdSet.has(member.id));
  }, [cookingFamilyMemberIds, familyMembers]);

  return {
    instructions: recipe.instructions,
    familyMembers: cookingMembers,
    recipeServings: recipe.servings,
    audienceMemberIds,
    memberPortions,
    mealCount,
    cookingFamilyMemberIds,
    effectiveRecipeIngredientById,
    selectedUnits,
    getIngredientDisplayScalingFactor,
    getIngredientCalorieFactor,
  };
}

export function useRecipePageIngredientsSectionData() {
  const {
    recipe,
    ingredients,
    familyMembers,
    memberPortions,
    cookingFamilyMemberIds,
    mealCount,
    effectiveRecipeIngredientById,
    hasActiveScaling,
    localScaleByIngredientId,
    selectedUnits,
    ungroupedIngredients,
    visibleGroupedIngredients,
    cookingAggregatedUngrouped,
    cookingAggregatedByGroupId,
    onReset,
    onUnitChange,
    onAggregatedAmountEdit,
    onApplyScaleToAll,
    onIngredientChange,
  } = useRecipePageContext();

  return {
    recipe,
    ingredients,
    familyMembers,
    memberPortions,
    cookingFamilyMemberIds,
    mealCount,
    effectiveRecipeIngredientById,
    hasActiveScaling,
    localScaleByIngredientId,
    selectedUnits,
    ungroupedIngredients,
    visibleGroupedIngredients,
    cookingAggregatedUngrouped,
    cookingAggregatedByGroupId,
    onReset,
    onUnitChange,
    onAggregatedAmountEdit,
    onApplyScaleToAll,
    onIngredientChange,
  };
}

export function useRecipePageAddToLogData() {
  const {
    recipe,
    familyMembers,
    mealCount,
    recipeForScaledNutrition,
    cookingFamilyMemberIds,
    audienceMemberIds,
    memberPortions,
    availableLogDateKeys,
  } = useRecipePageContext();

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    recipeIngredients: recipeForScaledNutrition.ingredients,
    familyMembers,
    audienceMemberIds,
    memberPortions,
    cookingFamilyMemberIds,
    recipeServings: recipe.servings,
    mealCount,
    availableLogDateKeys,
  };
}
