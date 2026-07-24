import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import type { IngredientType } from "@/types/ingredient";
import { IngredientItem } from "@/components/recipes/ingredient-item";
import { isScaleModified } from "@/lib/recipes/helpers";
import { getBatchPortionShares, getSharedPortionShares } from "@/lib/recipes/shared-portion-shares";
import { useRecipePageIngredientsSectionData } from "@/components/context/recipe-page-context";
import { PortionSplitCard } from "@/components/recipes/recipe-page/portion-split-card";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import type { CookingAggregatedLine } from "@/lib/recipes/resolve-cooking-display-lines";
import type { RecipeType } from "@/types/recipe";
import type { FamilyMemberRow } from "@/lib/db/family-members";

const BASIC_PORTION_SCOPE_LABEL = "Portion sizes";
const BATCH_SPLIT_SCOPE_LABEL = "Batch split";

function resolveUnitForAggregatedLine(
  line: CookingAggregatedLine,
  primaryRecipeIngredient: RecipeType["ingredients"][number] | undefined,
  ingredients: IngredientType[],
): { id: string; name: string; namePlural: string | null } | null {
  if (primaryRecipeIngredient?.unit?.id === line.unitId) {
    return {
      id: primaryRecipeIngredient.unit.id,
      name: primaryRecipeIngredient.unit.name,
      namePlural: primaryRecipeIngredient.unit.namePlural ?? null,
    };
  }

  const catalogIngredient = ingredients.find(
    (entry) => entry.id === line.ingredientId,
  );
  const conversion = catalogIngredient?.unitConversions.find(
    (entry) => entry.unitId === line.unitId,
  );
  if (conversion?.unit) {
    return {
      id: conversion.unit.id,
      name: conversion.unit.name,
      namePlural: conversion.unit.namePlural ?? null,
    };
  }

  return primaryRecipeIngredient?.unit ?? null;
}

function renderAggregatedLines(params: {
  lines: CookingAggregatedLine[];
  ingredients: IngredientType[];
  effectiveRecipeIngredientById: Map<string, RecipeType["ingredients"][number]>;
  selectedUnits: Record<string, string | null>;
  localScaleByIngredientId: Record<string, number>;
  recipeServings: number;
  cookingFamilyMembers: FamilyMemberRow[];
  onUnitChange: (recipeIngredientId: string, unitId: string | null) => void;
  onAggregatedAmountEdit: (
    sourceRecipeIngredientIds: string[],
    ratio: number,
    activeCalorieScalingFactor: number,
  ) => void;
  onApplyScaleToAll: (recipeIngredientId: string) => void;
  onIngredientChange: (recipeIngredientId: string, ingredientId: string) => void;
}) {
  const {
    lines,
    ingredients,
    effectiveRecipeIngredientById,
    selectedUnits,
    localScaleByIngredientId,
    recipeServings,
    cookingFamilyMembers,
    onUnitChange,
    onAggregatedAmountEdit,
    onApplyScaleToAll,
    onIngredientChange,
  } = params;

  return lines.map((line) => {
    const primaryRecipeIngredient = effectiveRecipeIngredientById.get(
      line.primaryRecipeIngredientId,
    );
    if (!primaryRecipeIngredient) {
      return null;
    }

    const resolvedIngredient =
      ingredients.find((entry) => entry.id === line.ingredientId) ??
      primaryRecipeIngredient.ingredient;
    const displayUnit = resolveUnitForAggregatedLine(
      line,
      primaryRecipeIngredient,
      ingredients,
    );
    const displayRecipeIngredient: RecipeType["ingredients"][number] = {
      ...primaryRecipeIngredient,
      ingredient: resolvedIngredient,
      ingredientId: resolvedIngredient.id,
      additionalInfo: line.primaryAdditionalInfo,
      unit: displayUnit,
      unitId: displayUnit?.id ?? line.unitId,
    };

    const showApplyScaleAction = line.sourceRecipeIngredientIds.some((id) =>
      isScaleModified(localScaleByIngredientId[id] ?? 1),
    );
    const allowIngredientSwap = line.sourceRecipeIngredientIds.length === 1;

    return (
      <IngredientItem
        key={line.key}
        recipeIngredient={displayRecipeIngredient}
        resolvedBaseAmount={line.resolvedAmount}
        hidePeoplePanel
        hideSupermarketLink
        cookingMemberAmounts={line.memberAmounts}
        cookingFamilyMembers={cookingFamilyMembers}
        disableIngredientSwap={!allowIngredientSwap}
        selectedUnitId={
          selectedUnits[line.primaryRecipeIngredientId] || line.unitId
        }
        onUnitChange={(unitId) =>
          onUnitChange(line.primaryRecipeIngredientId, unitId)
        }
        servingScalingFactor={1}
        calorieScalingFactor={1}
        onAmountEdit={(ratio, activeCalorieScalingFactor) =>
          onAggregatedAmountEdit(
            line.sourceRecipeIngredientIds,
            ratio,
            activeCalorieScalingFactor,
          )
        }
        showApplyScaleAction={showApplyScaleAction}
        onApplyScaleToAll={() =>
          onApplyScaleToAll(line.primaryRecipeIngredientId)
        }
        onIngredientChange={(ingredientId) =>
          onIngredientChange(line.primaryRecipeIngredientId, ingredientId)
        }
        replacementCandidates={ingredients}
        ingredientCatalog={ingredients}
        recipeServings={recipeServings}
        familyMembers={[]}
        audienceMemberIds={[]}
        memberPortions={[]}
      />
    );
  });
}

export function IngredientsSection() {
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
  } = useRecipePageIngredientsSectionData();

  const cookingFamilyMembers = useMemo(() => {
    const cookingIdSet = new Set(cookingFamilyMemberIds);
    return familyMembers.filter((member) => cookingIdSet.has(member.id));
  }, [cookingFamilyMemberIds, familyMembers]);

  const isAppliedAdvanced = advancedMode === "applied";

  const portionSplitMembers = useMemo(() => {
    // Applied advanced: batch split by meals × multiplier. Otherwise: one-meal pie.
    const shares = isAppliedAdvanced
      ? getBatchPortionShares(
          cookingFamilyMembers,
          memberPortions,
          personMealCounts,
        )
      : getSharedPortionShares(cookingFamilyMembers, memberPortions);

    return shares.map((entry, index) => {
      const member = cookingFamilyMembers.find(
        (familyMember) => familyMember.id === entry.familyMemberId,
      );
      const label =
        member?.name.trim() ||
        (member?.isSelf ? "You" : `Family member ${index + 1}`);
      return {
        label,
        share: entry.share,
        multiplier: entry.multiplier,
        weight: entry.weight,
      };
    });
  }, [
    cookingFamilyMembers,
    isAppliedAdvanced,
    memberPortions,
    personMealCounts,
  ]);

  const showPortionSplitChart = portionSplitMembers.length > 1;
  const portionScopeLabel = isAppliedAdvanced
    ? BATCH_SPLIT_SCOPE_LABEL
    : BASIC_PORTION_SCOPE_LABEL;

  const sharedRenderParams = useMemo(
    () => ({
      ingredients,
      effectiveRecipeIngredientById,
      selectedUnits,
      localScaleByIngredientId,
      recipeServings: recipe.servings,
      cookingFamilyMembers,
      onUnitChange,
      onAggregatedAmountEdit,
      onApplyScaleToAll,
      onIngredientChange,
    }),
    [
      effectiveRecipeIngredientById,
      ingredients,
      localScaleByIngredientId,
      cookingFamilyMembers,
      onAggregatedAmountEdit,
      onApplyScaleToAll,
      onIngredientChange,
      onUnitChange,
      recipe.servings,
      selectedUnits,
    ],
  );

  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    return null;
  }

  const hasUngroupedLines = cookingAggregatedUngrouped.length > 0;

  return (
    <div>
      <div className="mb-item flex items-center justify-between">
        <div className="flex min-w-0 flex-col gap-tight">
          <div className="flex items-center gap-item">
            <Subheader>Ingredients</Subheader>
            {hasActiveScaling && (
              <Button
                // Match other outlined icon buttons (note, scale, supermarket).
                variant="outline"
                size="icon-sm"
                onClick={onReset}
                aria-label="Reset ingredient amounts"
              >
                <RotateCcw />
              </Button>
            )}
          </div>
          {mealCount > 1 ? (
            <p className="type-caption text-muted-foreground">
              Totals for {mealCount} meals
            </p>
          ) : null}
        </div>
      </div>
      {showPortionSplitChart ? (
        <PortionSplitCard
          members={portionSplitMembers}
          scopeLabel={portionScopeLabel}
        />
      ) : null}
      {ungroupedIngredients.length > 0 && hasUngroupedLines ? (
        <div className="mb-item">
          <ul className="space-y-item type-body">
            {renderAggregatedLines({
              lines: cookingAggregatedUngrouped,
              ...sharedRenderParams,
            })}
          </ul>
        </div>
      ) : null}

      {visibleGroupedIngredients.map((group) => {
        const groupLines = cookingAggregatedByGroupId.get(group.id) ?? [];
        if (groupLines.length === 0) {
          return null;
        }

        return (
          <div key={group.id} className="mb-item">
            <h4 className="mb-tight type-overline text-muted-foreground">
              {group.name}
            </h4>
            <ul className="space-y-item type-body">
              {renderAggregatedLines({
                lines: groupLines,
                ...sharedRenderParams,
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
