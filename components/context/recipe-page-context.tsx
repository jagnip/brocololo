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
  addMemberToAllMeals,
  clonePerMealAudience,
  deriveCookingUnionIds,
  derivePersonMealCounts,
  formatPersonMealSummary,
  isAdvancedDraftDifferentFromBasic,
  removeMemberFromAllMeals,
  resizePerMealAudience,
  seedPerMealAudience,
} from "@/lib/recipes/cook-session-portions";

export type AdvancedCookingMode = "basic" | "editing" | "applied";

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
  advancedMode: AdvancedCookingMode;
  draftPerMealAudience: string[][];
  onDraftPerMealAudienceChange: (mealIndex: number, nextIds: string[]) => void;
  draftExtraPortions: number;
  onDraftExtraPortionsChange: (next: number) => void;
  appliedExtraPortions: number;
  appliedPersonMealSummary: string;
  personMealCounts: Map<string, number>;
  onOpenAdvancedSettings: () => void;
  onDoneAdvanced: () => void;
  onResetAdvanced: () => void;
  onEditAdvanced: () => void;
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

  // Advanced cooking: draft while editing; applied drives math when committed.
  const [advancedMode, setAdvancedMode] =
    useState<AdvancedCookingMode>("basic");
  const [draftPerMealAudience, setDraftPerMealAudience] = useState<string[][]>(
    () => [familyMembers.map((member) => member.id)],
  );
  const [draftExtraPortions, setDraftExtraPortions] = useState(0);
  const [appliedPerMealAudience, setAppliedPerMealAudience] = useState<
    string[][] | null
  >(null);
  const [appliedExtraPortions, setAppliedExtraPortions] = useState(0);

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

  // Reset all cooking session state when recipe or household changes.
  useEffect(() => {
    const allIds = familyMembers.map((member) => member.id);
    setCookingFamilyMemberIds(allIds);
    setDraftPerMealAudience([allIds]);
    setDraftExtraPortions(0);
    setAppliedPerMealAudience(null);
    setAppliedExtraPortions(0);
    setAdvancedMode("basic");
  }, [familyMembers, recipe.id]);

  // Keep draft meal list length in sync with mealCount while editing or basic.
  // In applied mode, meal-count changes resize applied (and draft) via handlers below.
  useEffect(() => {
    if (advancedMode === "applied") {
      return;
    }
    setDraftPerMealAudience((prev) =>
      resizePerMealAudience(prev, scaling.mealCount, cookingFamilyMemberIds),
    );
  }, [advancedMode, cookingFamilyMemberIds, scaling.mealCount]);

  const effectiveRecipe = useMemo(
    () =>
      buildEffectiveRecipeForSimulation(
        recipe,
        scaling.swapsByRecipeIngredientId,
        ingredients,
      ),
    [ingredients, recipe, scaling.swapsByRecipeIngredientId],
  );

  // Math source: applied session when committed; otherwise basic uniform meals.
  const mathPerMealAudience = appliedPerMealAudience;
  const mathExtraPortions =
    appliedPerMealAudience != null ? appliedExtraPortions : 0;

  const personMealCounts = useMemo(() => {
    if (mathPerMealAudience) {
      return derivePersonMealCounts(mathPerMealAudience);
    }
    const counts = new Map<string, number>();
    for (const id of cookingFamilyMemberIds) {
      counts.set(id, scaling.mealCount);
    }
    return counts;
  }, [cookingFamilyMemberIds, mathPerMealAudience, scaling.mealCount]);

  const nutritionCookingIds = useMemo(() => {
    if (mathPerMealAudience) {
      return deriveCookingUnionIds(mathPerMealAudience, familyMembers);
    }
    return cookingFamilyMemberIds;
  }, [cookingFamilyMemberIds, familyMembers, mathPerMealAudience]);

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
      mealCount: scaling.mealCount,
      audienceMemberIds,
      memberPortions,
      getRowDisplayScale,
      ...(mathPerMealAudience
        ? {
            perMealAudience: mathPerMealAudience,
            personMealCounts,
            extraPortions: mathExtraPortions,
          }
        : {}),
    }),
    [
      audienceMemberIds,
      familyMembers,
      getRowDisplayScale,
      mathExtraPortions,
      mathPerMealAudience,
      memberPortions,
      nutritionCookingIds,
      personMealCounts,
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

  const appliedPersonMealSummary = useMemo(() => {
    if (!appliedPerMealAudience) {
      return "";
    }
    return formatPersonMealSummary(
      derivePersonMealCounts(appliedPerMealAudience),
      familyMembers,
    );
  }, [appliedPerMealAudience, familyMembers]);

  const handleMealCountChange = useCallback(
    (nextCount: number) => {
      scaling.handleMealCountChange(nextCount);
      // Applied mode: resize applied meals and auto-recommit.
      if (advancedMode === "applied" && appliedPerMealAudience) {
        const resized = resizePerMealAudience(
          appliedPerMealAudience,
          nextCount,
          cookingFamilyMemberIds,
        );
        setAppliedPerMealAudience(resized);
        setDraftPerMealAudience(clonePerMealAudience(resized));
        setCookingFamilyMemberIds(
          deriveCookingUnionIds(resized, familyMembers),
        );
      }
    },
    [
      advancedMode,
      appliedPerMealAudience,
      cookingFamilyMemberIds,
      familyMembers,
      scaling,
    ],
  );

  const handleCookingFamilyMemberIdsChange = useCallback(
    (nextIds: string[]) => {
      if (nextIds.length === 0) {
        return;
      }

      const prevSet = new Set(cookingFamilyMemberIds);
      const nextSet = new Set(nextIds);
      const added = nextIds.filter((id) => !prevSet.has(id));
      const removed = cookingFamilyMemberIds.filter((id) => !nextSet.has(id));

      setCookingFamilyMemberIds(nextIds);

      // Applied mode: add/remove people across all meal cards and recommit.
      if (advancedMode === "applied" && appliedPerMealAudience) {
        let nextMeals = clonePerMealAudience(appliedPerMealAudience);
        for (const id of added) {
          nextMeals = addMemberToAllMeals(nextMeals, id);
        }
        for (const id of removed) {
          nextMeals = removeMemberFromAllMeals(nextMeals, id);
        }
        setAppliedPerMealAudience(nextMeals);
        setDraftPerMealAudience(clonePerMealAudience(nextMeals));
      }
    },
    [advancedMode, appliedPerMealAudience, cookingFamilyMemberIds],
  );

  const handleDraftPerMealAudienceChange = useCallback(
    (mealIndex: number, nextIds: string[]) => {
      setDraftPerMealAudience((prev) =>
        prev.map((ids, index) => (index === mealIndex ? nextIds : ids)),
      );
    },
    [],
  );

  const handleDraftExtraPortionsChange = useCallback((next: number) => {
    setDraftExtraPortions(Math.max(0, Math.min(99, next)));
  }, []);

  const handleOpenAdvancedSettings = useCallback(() => {
    // Seed draft from applied (if any) or from current basic selection.
    if (appliedPerMealAudience) {
      setDraftPerMealAudience(clonePerMealAudience(appliedPerMealAudience));
      setDraftExtraPortions(appliedExtraPortions);
    } else {
      setDraftPerMealAudience(
        seedPerMealAudience(scaling.mealCount, cookingFamilyMemberIds),
      );
      setDraftExtraPortions(0);
    }
    setAdvancedMode("editing");
  }, [
    appliedExtraPortions,
    appliedPerMealAudience,
    cookingFamilyMemberIds,
    scaling.mealCount,
  ]);

  const handleDoneAdvanced = useCallback(() => {
    const differs = isAdvancedDraftDifferentFromBasic({
      perMealAudience: draftPerMealAudience,
      cookingFamilyMemberIds,
      extraPortions: draftExtraPortions,
    });

    if (!differs) {
      // No-op Done — stay/return to basic without Advanced badge.
      setAppliedPerMealAudience(null);
      setAppliedExtraPortions(0);
      setAdvancedMode("basic");
      return;
    }

    const committed = clonePerMealAudience(draftPerMealAudience);
    setAppliedPerMealAudience(committed);
    setAppliedExtraPortions(draftExtraPortions);
    setCookingFamilyMemberIds(
      deriveCookingUnionIds(committed, familyMembers),
    );
    setAdvancedMode("applied");
  }, [
    cookingFamilyMemberIds,
    draftExtraPortions,
    draftPerMealAudience,
    familyMembers,
  ]);

  const handleResetAdvanced = useCallback(() => {
    if (advancedMode === "editing" && appliedPerMealAudience) {
      // Discard draft; restore last applied.
      setDraftPerMealAudience(clonePerMealAudience(appliedPerMealAudience));
      setDraftExtraPortions(appliedExtraPortions);
      setAdvancedMode("applied");
      return;
    }

    // Clear applied / abandon draft → basic.
    setAppliedPerMealAudience(null);
    setAppliedExtraPortions(0);
    setDraftPerMealAudience(
      seedPerMealAudience(scaling.mealCount, cookingFamilyMemberIds),
    );
    setDraftExtraPortions(0);
    setAdvancedMode("basic");
  }, [
    advancedMode,
    appliedExtraPortions,
    appliedPerMealAudience,
    cookingFamilyMemberIds,
    scaling.mealCount,
  ]);

  const handleEditAdvanced = useCallback(() => {
    if (!appliedPerMealAudience) {
      return;
    }
    setDraftPerMealAudience(clonePerMealAudience(appliedPerMealAudience));
    setDraftExtraPortions(appliedExtraPortions);
    setAdvancedMode("editing");
  }, [appliedExtraPortions, appliedPerMealAudience]);

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
      onCookingFamilyMemberIdsChange: handleCookingFamilyMemberIdsChange,
      advancedMode,
      draftPerMealAudience,
      onDraftPerMealAudienceChange: handleDraftPerMealAudienceChange,
      draftExtraPortions,
      onDraftExtraPortionsChange: handleDraftExtraPortionsChange,
      appliedExtraPortions,
      appliedPersonMealSummary,
      personMealCounts,
      onOpenAdvancedSettings: handleOpenAdvancedSettings,
      onDoneAdvanced: handleDoneAdvanced,
      onResetAdvanced: handleResetAdvanced,
      onEditAdvanced: handleEditAdvanced,
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
      mealBatchScaleFactor: scaling.mealCount,
      availableLogDateKeys,
    }),
    [
      advancedMode,
      appliedExtraPortions,
      appliedPersonMealSummary,
      audienceMemberIds,
      availableLogDateKeys,
      cookingAggregatedByGroupId,
      cookingAggregatedUngrouped,
      cookingFamilyMemberIds,
      draftExtraPortions,
      draftPerMealAudience,
      familyMembers,
      handleAggregatedAmountEdit,
      handleCookingFamilyMemberIdsChange,
      handleDoneAdvanced,
      handleDraftExtraPortionsChange,
      handleDraftPerMealAudienceChange,
      handleEditAdvanced,
      handleMealCountChange,
      handleOpenAdvancedSettings,
      handleResetAdvanced,
      ingredients,
      memberPortions,
      nutrition.effectiveRecipeIngredientById,
      nutrition.getIngredientCalorieFactor,
      nutrition.getIngredientDisplayScalingFactor,
      nutrition.nutritionRows,
      nutrition.recipeForScaledNutrition,
      originalRecipeIngredientById,
      personMealCounts,
      recipe,
      scaling,
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
    mealCount,
    onMealCountChange,
    familyMembers,
    cookingFamilyMemberIds,
    onCookingFamilyMemberIdsChange,
    advancedMode,
    draftPerMealAudience,
    onDraftPerMealAudienceChange,
    draftExtraPortions,
    onDraftExtraPortionsChange,
    appliedExtraPortions,
    appliedPersonMealSummary,
    onOpenAdvancedSettings,
    onDoneAdvanced,
    onResetAdvanced,
    onEditAdvanced,
  } = useRecipePageContext();
  return {
    mealCount,
    onMealCountChange,
    familyMembers,
    cookingFamilyMemberIds,
    onCookingFamilyMemberIdsChange,
    advancedMode,
    draftPerMealAudience,
    onDraftPerMealAudienceChange,
    draftExtraPortions,
    onDraftExtraPortionsChange,
    appliedExtraPortions,
    appliedPersonMealSummary,
    onOpenAdvancedSettings,
    onDoneAdvanced,
    onResetAdvanced,
    onEditAdvanced,
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
    advancedMode,
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
    advancedMode,
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
