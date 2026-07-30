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
import {
  clampCombinationCount,
  createDefaultCombinations,
  deriveCookingUnionIds,
  derivePersonMealCounts,
  expandCombinationsToPerMealAudience,
  isAdvancedDraftDifferentFromBasic,
  totalMealCountFromCombinations,
  type CookingCombination,
} from "@/lib/recipes/cook-session-portions";
import { decodePlanCookParam } from "@/lib/recipes/plan-cook-session-link";

type RecipePageProviderProps = {
  recipe: RecipeType;
  ingredients: IngredientType[];
  familyMembers: FamilyMemberRow[];
  availableLogDateKeys: string[];
  /** Encoded planner cook hand-off (`?cook=`), if present. */
  initialCookParam?: string | null;
  children: ReactNode;
};

type RecipePageContextValue = {
  recipe: RecipeType;
  ingredients: IngredientType[];
  familyMembers: FamilyMemberRow[];
  mealCount: number;
  cookingFamilyMemberIds: string[];
  /** Combination rows: N meals for a shared audience. */
  combinations: CookingCombination[];
  onAddCombination: () => void;
  onRemoveCombination: (index: number) => void;
  onCombinationCountChange: (index: number, nextCount: number) => void;
  onCombinationMembersChange: (index: number, nextIds: string[]) => void;
  /** Expanded meal audiences derived from combinations (math input). */
  perMealAudience: string[][];
  extraPortions: number;
  onExtraPortionsChange: (next: number) => void;
  /** True when multiple combinations or extras are set. */
  isAdvancedActive: boolean;
  /** True when Cooking was prefilled from a planner link and not yet edited. */
  isPlanCookSessionActive: boolean;
  onResetPlanCookSession: () => void;
  /** Plan slot dates (YYYY-MM-DD) from the `?cook=` hand-off, when active. */
  planCookDateKeys: string[];
  personMealCounts: Map<string, number>;
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

type CookSessionState = {
  combinations: CookingCombination[];
  isPlanCookSessionActive: boolean;
  /** YYYY-MM-DD keys from the planner hand-off (for the Meals banner). */
  planCookDateKeys: string[];
};

/**
 * The cooking session to start from: a planner `?cook=` hand-off when present,
 * otherwise one meal for the whole household.
 */
function createCookSessionState(
  initialCookParam: string | null,
  familyMembers: FamilyMemberRow[],
): CookSessionState {
  const householdIds = familyMembers.map((member) => member.id);
  const decoded = initialCookParam
    ? decodePlanCookParam(initialCookParam, householdIds)
    : null;

  return {
    combinations:
      decoded?.combinations ?? createDefaultCombinations(householdIds),
    isPlanCookSessionActive: decoded !== null,
    planCookDateKeys: decoded?.dateKeys ?? [],
  };
}

/** Value-based identity of the inputs the cooking session is derived from. */
function getCookSessionSignature(
  recipeId: string,
  familyMembers: FamilyMemberRow[],
  initialCookParam: string | null,
): string {
  const householdIds = familyMembers.map((member) => member.id).join(",");
  return `${recipeId}|${householdIds}|${initialCookParam ?? ""}`;
}

export function RecipePageProvider({
  recipe,
  ingredients,
  familyMembers,
  availableLogDateKeys,
  initialCookParam = null,
  children,
}: RecipePageProviderProps) {
  // Decode once for both combinations + banner flag (lazy state init only runs once).
  const [cookSession, setCookSession] = useState(() =>
    createCookSessionState(initialCookParam, familyMembers),
  );
  const [extraPortions, setExtraPortions] = useState(0);

  // Re-derive the session when recipe / household / hand-off actually change.
  // This used to be an effect, but effects re-run on every mount (React StrictMode
  // runs them twice in dev) and on any new `familyMembers` array identity, which
  // wiped a planner `?cook=` hand-off right after it was hydrated. Comparing the
  // inputs by value during render makes the reset idempotent instead.
  const cookSessionSignature = getCookSessionSignature(
    recipe.id,
    familyMembers,
    initialCookParam,
  );
  const [appliedCookSessionSignature, setAppliedCookSessionSignature] =
    useState(cookSessionSignature);

  if (appliedCookSessionSignature !== cookSessionSignature) {
    setAppliedCookSessionSignature(cookSessionSignature);
    setCookSession(createCookSessionState(initialCookParam, familyMembers));
    setExtraPortions(0);
  }

  const combinations = cookSession.combinations;
  const isPlanCookSessionActive = cookSession.isPlanCookSessionActive;
  const planCookDateKeys = cookSession.planCookDateKeys;

  const setCombinations = useCallback(
    (
      next:
        | CookingCombination[]
        | ((prev: CookingCombination[]) => CookingCombination[]),
    ) => {
      setCookSession((prev) => ({
        ...prev,
        combinations:
          typeof next === "function" ? next(prev.combinations) : next,
      }));
    },
    [],
  );

  const setIsPlanCookSessionActive = useCallback((next: boolean) => {
    setCookSession((prev) =>
      prev.isPlanCookSessionActive === next
        ? prev
        : { ...prev, isPlanCookSessionActive: next },
    );
  }, []);

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

  const perMealAudience = useMemo(
    () => expandCombinationsToPerMealAudience(combinations),
    [combinations],
  );

  const mealCount = useMemo(
    () => totalMealCountFromCombinations(combinations),
    [combinations],
  );

  // Keep scaling.mealCount aligned with combination totals (used by batch scale).
  useEffect(() => {
    if (scaling.mealCount !== mealCount) {
      scaling.handleMealCountChange(mealCount);
    }
  }, [mealCount, scaling.handleMealCountChange, scaling.mealCount]);

  const cookingFamilyMemberIds = useMemo(
    () => deriveCookingUnionIds(perMealAudience, familyMembers),
    [familyMembers, perMealAudience],
  );

  const effectiveRecipe = useMemo(
    () =>
      buildEffectiveRecipeForSimulation(
        recipe,
        scaling.swapsByRecipeIngredientId,
        ingredients,
      ),
    [ingredients, recipe, scaling.swapsByRecipeIngredientId],
  );

  const personMealCounts = useMemo(
    () => derivePersonMealCounts(perMealAudience),
    [perMealAudience],
  );

  const isAdvancedActive = useMemo(
    () =>
      isAdvancedDraftDifferentFromBasic({
        combinations,
        extraPortions,
      }),
    [combinations, extraPortions],
  );

  // Nutrition rows = everyone who appears on any meal.
  const nutritionCookingIds = cookingFamilyMemberIds;

  const nutrition = useRecipeNutrition({
    recipe,
    effectiveRecipe,
    ingredientCatalog: ingredients,
    cookingFamilyMemberIds: nutritionCookingIds,
    calorieTarget: scaling.calorieTarget,
    globalScaleRatio: scaling.globalScaleRatio,
    localScaleByIngredientId: scaling.localScaleByIngredientId,
    familyMembers,
  });

  const { ungroupedIngredients, visibleGroupedIngredients } =
    useIngredientGrouping({
      ingredientGroups: recipe.ingredientGroups,
      ingredients: effectiveRecipe.ingredients,
    });

  const getRowDisplayScale = useCallback(
    (recipeIngredientId: string) => {
      const row =
        nutrition.effectiveRecipeIngredientById.get(recipeIngredientId);
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
      cookingFamilyMemberIds: nutritionCookingIds,
      mealCount,
      audienceMemberIds,
      memberPortions,
      getRowDisplayScale,
      perMealAudience,
      personMealCounts,
      extraPortions,
    }),
    [
      audienceMemberIds,
      extraPortions,
      familyMembers,
      getRowDisplayScale,
      mealCount,
      memberPortions,
      nutritionCookingIds,
      perMealAudience,
      personMealCounts,
      recipe.servings,
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

  const handleAddCombination = useCallback(() => {
    setIsPlanCookSessionActive(false);
    const seedIds = familyMembers.map((member) => member.id);
    setCombinations((prev) => [...prev, { count: 1, memberIds: seedIds }]);
  }, [familyMembers, setCombinations, setIsPlanCookSessionActive]);

  const handleRemoveCombination = useCallback(
    (index: number) => {
      setIsPlanCookSessionActive(false);
      setCombinations((prev) => {
        if (prev.length <= 1) {
          return prev;
        }
        return prev.filter((_, rowIndex) => rowIndex !== index);
      });
    },
    [setCombinations, setIsPlanCookSessionActive],
  );

  const handleCombinationCountChange = useCallback(
    (index: number, nextCount: number) => {
      setIsPlanCookSessionActive(false);
      const count = clampCombinationCount(nextCount);
      setCombinations((prev) =>
        prev.map((combination, rowIndex) =>
          rowIndex === index ? { ...combination, count } : combination,
        ),
      );
    },
    [setCombinations, setIsPlanCookSessionActive],
  );

  const handleCombinationMembersChange = useCallback(
    (index: number, nextIds: string[]) => {
      if (nextIds.length === 0) {
        return;
      }
      setIsPlanCookSessionActive(false);
      setCombinations((prev) =>
        prev.map((combination, rowIndex) =>
          rowIndex === index
            ? { ...combination, memberIds: nextIds }
            : combination,
        ),
      );
    },
    [setCombinations, setIsPlanCookSessionActive],
  );

  const handleExtraPortionsChange = useCallback(
    (next: number) => {
      setIsPlanCookSessionActive(false);
      setExtraPortions(Math.max(0, Math.min(99, next)));
    },
    [setIsPlanCookSessionActive],
  );

  const handleResetPlanCookSession = useCallback(() => {
    const allIds = familyMembers.map((member) => member.id);
    setCookSession({
      combinations: createDefaultCombinations(allIds),
      isPlanCookSessionActive: false,
      planCookDateKeys: [],
    });
    setExtraPortions(0);
  }, [familyMembers]);

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
      mealCount,
      cookingFamilyMemberIds,
      combinations,
      onAddCombination: handleAddCombination,
      onRemoveCombination: handleRemoveCombination,
      onCombinationCountChange: handleCombinationCountChange,
      onCombinationMembersChange: handleCombinationMembersChange,
      perMealAudience,
      extraPortions,
      onExtraPortionsChange: handleExtraPortionsChange,
      isAdvancedActive,
      isPlanCookSessionActive,
      onResetPlanCookSession: handleResetPlanCookSession,
      planCookDateKeys,
      personMealCounts,
      audienceMemberIds,
      memberPortions,
      calorieTarget: scaling.calorieTarget,
      nutritionRows: nutrition.nutritionRows,
      onCaloriesChange: scaling.handleCaloriesChange,
      effectiveRecipeIngredientById: nutrition.effectiveRecipeIngredientById,
      selectedUnits: scaling.selectedUnits,
      getIngredientDisplayScalingFactor:
        nutrition.getIngredientDisplayScalingFactor,
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
      mealBatchScaleFactor: mealCount,
      availableLogDateKeys,
    }),
    [
      audienceMemberIds,
      availableLogDateKeys,
      combinations,
      cookingAggregatedByGroupId,
      cookingAggregatedUngrouped,
      cookingFamilyMemberIds,
      extraPortions,
      familyMembers,
      handleAddCombination,
      handleAggregatedAmountEdit,
      handleCombinationCountChange,
      handleCombinationMembersChange,
      handleExtraPortionsChange,
      handleRemoveCombination,
      handleResetPlanCookSession,
      ingredients,
      isAdvancedActive,
      isPlanCookSessionActive,
      planCookDateKeys,
      mealCount,
      memberPortions,
      nutrition.effectiveRecipeIngredientById,
      nutrition.getIngredientCalorieFactor,
      nutrition.getIngredientDisplayScalingFactor,
      nutrition.nutritionRows,
      nutrition.recipeForScaledNutrition,
      originalRecipeIngredientById,
      perMealAudience,
      personMealCounts,
      recipe,
      scaling.calorieTarget,
      scaling.handleCaloriesChange,
      scaling.handleIngredientChange,
      scaling.handleIngredientEdit,
      scaling.handleApplyScaleToAll,
      scaling.handleNutritionReset,
      scaling.handleReset,
      scaling.handleUnitChange,
      scaling.hasActiveNutritionScaling,
      scaling.hasActiveScaling,
      scaling.localScaleByIngredientId,
      scaling.selectedUnits,
      ungroupedIngredients,
      visibleGroupedIngredients,
    ],
  );

  return (
    <RecipePageContext.Provider value={value}>{children}</RecipePageContext.Provider>
  );
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
    familyMembers,
    combinations,
    onAddCombination,
    onRemoveCombination,
    onCombinationCountChange,
    onCombinationMembersChange,
    extraPortions,
    onExtraPortionsChange,
    isPlanCookSessionActive,
    onResetPlanCookSession,
    planCookDateKeys,
  } = useRecipePageContext();
  return {
    familyMembers,
    combinations,
    onAddCombination,
    onRemoveCombination,
    onCombinationCountChange,
    onCombinationMembersChange,
    extraPortions,
    onExtraPortionsChange,
    isPlanCookSessionActive,
    onResetPlanCookSession,
    planCookDateKeys,
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
    personMealCounts,
    extraPortions,
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
    personMealCounts,
    cookingFamilyMemberIds,
    extraPortions,
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
    personMealCounts,
    extraPortions,
    isAdvancedActive,
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
    personMealCounts,
    extraPortions,
    isAdvancedActive,
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
    // Always one personal portion — never × mealCount / personMealCounts.
    mealCount: 1,
    availableLogDateKeys,
  };
}
