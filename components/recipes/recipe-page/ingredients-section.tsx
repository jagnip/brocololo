import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import type { IngredientType } from "@/types/ingredient";
import { IngredientItem } from "@/components/recipes/ingredient-item";
import { isScaleModified } from "@/lib/recipes/helpers";
import { useRecipePageIngredientsSectionData } from "@/components/context/recipe-page-context";
import { PortionSplitCard } from "@/components/recipes/recipe-page/portion-split-card";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import { getFamilyMemberLabel } from "@/components/planner/family-member-multi-select";
import type { CookingAggregatedLine } from "@/lib/recipes/resolve-cooking-display-lines";
import type { RecipeType } from "@/types/recipe";
import type { FamilyMemberRow } from "@/lib/db/family-members";

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
  extraPortions: number;
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
    extraPortions,
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
    const displayUnit =
      resolveUnitForAggregatedLine(
        line,
        primaryRecipeIngredient,
        ingredients,
      ) ?? primaryRecipeIngredient.unit ?? null;
    const displayRecipeIngredient: RecipeType["ingredients"][number] = {
      ...primaryRecipeIngredient,
      ingredient: resolvedIngredient,
      ingredientId: resolvedIngredient.id,
      additionalInfo: line.primaryAdditionalInfo,
      unit: displayUnit,
      unitId: displayUnit?.id ?? (line.unitId || null),
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
        extraPortions={extraPortions}
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
    extraPortions,
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

  // Chart pool = Cooking union; pie weights = meals × multiplier (+ extras).
  const portionSplitAudience = useMemo(() => {
    const multiplierById = new Map(
      memberPortions.map((portion) => [
        portion.familyMemberId,
        portion.multiplier,
      ]),
    );
    const householdIndexById = new Map(
      familyMembers.map((member, index) => [member.id, index]),
    );
    return cookingFamilyMembers.map((member) => ({
      id: member.id,
      label: getFamilyMemberLabel(
        member,
        householdIndexById.get(member.id) ?? 0,
      ),
      sortOrder: member.sortOrder,
      multiplier: multiplierById.get(member.id) ?? 1,
      mealCount: personMealCounts.get(member.id) ?? 0,
    }));
  }, [cookingFamilyMembers, familyMembers, memberPortions, personMealCounts]);

  const showPortionSplit =
    portionSplitAudience.length >= 1 || extraPortions > 0;

  const sharedRenderParams = useMemo(
    () => ({
      ingredients,
      effectiveRecipeIngredientById,
      selectedUnits,
      localScaleByIngredientId,
      recipeServings: recipe.servings,
      cookingFamilyMembers,
      extraPortions,
      onUnitChange,
      onAggregatedAmountEdit,
      onApplyScaleToAll,
      onIngredientChange,
    }),
    [
      effectiveRecipeIngredientById,
      extraPortions,
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
      </div>
      {showPortionSplit ? (
        <PortionSplitCard
          members={portionSplitAudience}
          totalMealCount={mealCount}
          extraPortions={extraPortions}
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
