"use client";

import { RecipeType } from "@/types/recipe";
import { IngredientType } from "@/types/ingredient";
import {
  formatIngredientAmount,
  getUnitDisplayName,
  getIngredientDisplay,
  getIngredientNutritionPer100g,
  isGramUnit,
  scaleIngredientNutritionForGrams,
  type UnitConversionWithName,
} from "@/lib/recipes/helpers";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { getIngredientSelectorDisplay } from "@/lib/ingredients/format";
import {
  buildIngredientSearchSourceMap,
  ingredientsToSearchableSelectOptions,
  renderIngredientSearchDropdownLabel,
  renderIngredientSearchTriggerLabel,
} from "@/components/ingredients/ingredient-searchable-select-labels";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  ArrowLeftRight,
  Info,
  NotebookPen,
  ShoppingBasket,
  Users,
} from "lucide-react";
import { IngredientIcon } from "../ingredient-icon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { IngredientNutritionalInfo } from "./ingredient-nutritional-info";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "../ui/searchable-select";
import { IngredientRowActionButton } from "./ingredient-row-action-button";
import {
  IngredientMemberAdjustmentsSummary,
  buildUnitsCatalogMap,
} from "./ingredient-member-adjustments-summary";
import { IngredientNotePanel } from "./ingredient-note-panel";
import {
  getMemberAdjustmentCount,
  hasIngredientNote,
} from "@/lib/recipes/ingredient-adjustments";
import type { CookingAggregatedMemberAmount } from "@/lib/recipes/resolve-cooking-display-lines";
import { IngredientMemberAmountBadges } from "@/components/recipes/recipe-page/ingredient-member-amount-badges";

type IngredientItemProps = {
  recipeIngredient: RecipeType["ingredients"][number];
  replacementCandidates: IngredientType[];
  /** Full catalog for MODIFY substitute name resolution in summaries. */
  ingredientCatalog: IngredientType[];
  recipeServings: number;
  selectedUnitId: string | null;
  onUnitChange: (unitId: string | null) => void;
  servingScalingFactor: number;
  calorieScalingFactor: number;
  onAmountEdit: (ratio: number, activeCalorieScalingFactor: number) => void;
  showApplyScaleAction: boolean;
  onApplyScaleToAll: () => void;
  onIngredientChange: (ingredientId: string) => void;
  familyMembers: FamilyMemberRow[];
  audienceMemberIds: string[];
  memberPortions?: Array<{ familyMemberId: string; multiplier: number }>;
  /** Pre-scaled aggregated cook-session amount (manual scale already applied). */
  resolvedBaseAmount?: number | null;
  /** Hide People panel on aggregated view page rows. */
  hidePeoplePanel?: boolean;
  /** Hide supermarket shortcut on recipe view rows. */
  hideSupermarketLink?: boolean;
  /** Per-person cook-session amounts for aggregated view rows. */
  cookingMemberAmounts?: CookingAggregatedMemberAmount[];
  cookingFamilyMembers?: FamilyMemberRow[];
  /** Disable swap when an aggregated line spans multiple recipe rows. */
  disableIngredientSwap?: boolean;
};

export function IngredientItem({
  recipeIngredient,
  replacementCandidates,
  ingredientCatalog,
  recipeServings,
  selectedUnitId,
  onUnitChange,
  servingScalingFactor,
  calorieScalingFactor,
  onAmountEdit,
  showApplyScaleAction,
  onApplyScaleToAll,
  onIngredientChange,
  familyMembers,
  audienceMemberIds,
  memberPortions = [],
  resolvedBaseAmount = null,
  hidePeoplePanel = false,
  hideSupermarketLink = false,
  cookingMemberAmounts,
  cookingFamilyMembers = [],
  disableIngredientSwap = false,
}: IngredientItemProps) {
  const { ingredient } = recipeIngredient;
  const adjustmentCount = getMemberAdjustmentCount(
    recipeIngredient.memberAdjustments,
  );
  const hasNote = hasIngredientNote(recipeIngredient.additionalInfo);

  const unitsById = useMemo(
    () => buildUnitsCatalogMap(ingredientCatalog),
    [ingredientCatalog],
  );

  const catalogEntries = useMemo(
    () =>
      ingredientCatalog.map((entry) => ({
        id: entry.id,
        name: entry.name,
        brand: entry.brand,
        descriptor: entry.descriptor,
      })),
    [ingredientCatalog],
  );

  const {
    displayAmount,
    rawAmount,
    rawAmountInGrams,
    selectedUnitGramsPerUnit,
    displayUnitName,
    displayUnitNamePlural,
    availableUnits,
  } = getIngredientDisplay(
    resolvedBaseAmount ?? recipeIngredient.amount,
    recipeIngredient.unit?.id ?? null,
    recipeIngredient.unit?.name ?? null,
    selectedUnitId,
    ingredient.unitConversions,
    servingScalingFactor,
    calorieScalingFactor,
  );
  const ingredientDisplayName = getIngredientSelectorDisplay({
    name: ingredient.name,
    brand: ingredient.brand,
    descriptor: ingredient.descriptor,
  }).label;
  const amountAriaLabel = `Amount of ${ingredientDisplayName}`;

  const getUnitOptionLabel = (unitId: string) => {
    const optionDisplay = getIngredientDisplay(
      resolvedBaseAmount ?? recipeIngredient.amount,
      recipeIngredient.unit?.id ?? null,
      recipeIngredient.unit?.name ?? null,
      unitId,
      ingredient.unitConversions,
      servingScalingFactor,
      calorieScalingFactor,
    );
    return getUnitDisplayName({
      amount: optionDisplay.rawAmount,
      unitName: optionDisplay.displayUnitName,
      unitNamePlural: optionDisplay.displayUnitNamePlural,
    });
  };

  const nutrition = getIngredientNutritionPer100g(ingredient);
  const showPerOneSelectedUnitColumn =
    selectedUnitGramsPerUnit != null && !isGramUnit(displayUnitName);
  const oneSelectedUnitNutrition = !showPerOneSelectedUnitColumn
    ? null
    : scaleIngredientNutritionForGrams(nutrition, selectedUnitGramsPerUnit);
  const selectedAmountNutrition =
    rawAmountInGrams == null
      ? null
      : scaleIngredientNutritionForGrams(nutrition, rawAmountInGrams);
  const oneUnitHeader =
    displayUnitName && showPerOneSelectedUnitColumn
      ? `1 ${displayUnitName} (${formatIngredientAmount(
          selectedUnitGramsPerUnit ?? 0,
          2,
        )}g)`
      : null;
  const selectedAmountText =
    rawAmount == null
      ? null
      : rawAmount > 0 && rawAmount < 0.1
        ? "<0.1"
        : formatIngredientAmount(rawAmount, 2);
  const selectedUnitLabel = getUnitDisplayName({
    amount: rawAmount,
    unitName: displayUnitName,
    unitNamePlural: displayUnitNamePlural,
  });
  const selectedAmountHeader =
    selectedAmountText && selectedUnitLabel && rawAmountInGrams != null
      ? isGramUnit(displayUnitName)
        ? `${selectedAmountText}g`
        : `${selectedAmountText} ${selectedUnitLabel} (${formatIngredientAmount(
            rawAmountInGrams,
            2,
          )}g)`
      : null;

  const [isEditing, setIsEditing] = useState(false);
  const [showPeoplePanel, setShowPeoplePanel] = useState(false);
  const [showNotePanel, setShowNotePanel] = useState(false);
  const [showNutritionDetails, setShowNutritionDetails] = useState(false);
  const [editValue, setEditValue] = useState("");
  const initialEditValueRef = useRef("");
  const committedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleFocus = () => {
    committedRef.current = false;
    const displayed =
      rawAmount == null ? "" : formatIngredientAmount(rawAmount, 2);
    setIsEditing(true);
    setEditValue(displayed);
    initialEditValueRef.current = displayed;
  };

  const handleCommit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    setIsEditing(false);

    if (editValue === initialEditValueRef.current) return;

    const newValue = parseFloat(editValue);
    if (
      isNaN(newValue) ||
      newValue <= 0 ||
      rawAmount == null ||
      rawAmount === 0
    ) {
      return;
    }

    onAmountEdit(newValue / rawAmount, calorieScalingFactor);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCommit();
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      committedRef.current = true;
      setIsEditing(false);
      inputRef.current?.blur();
    }
  };

  const isEditable = rawAmount != null;
  const canRenderAmountAndUnit =
    recipeIngredient.unit != null && displayAmount != null;
  const ingredientCandidates = [
    ingredient,
    ...replacementCandidates.filter(
      (candidate) => candidate.id !== ingredient.id,
    ),
  ];
  const ingredientSelectSources = useMemo(
    () =>
      ingredientCandidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        brand: candidate.brand,
        descriptor: candidate.descriptor,
        icon: candidate.icon,
        category: candidate.category ?? null,
      })),
    [ingredientCandidates],
  );

  const ingredientByIdForSelect = useMemo(
    () => buildIngredientSearchSourceMap(ingredientSelectSources),
    [ingredientSelectSources],
  );

  const ingredientOptions = useMemo(
    () => ingredientsToSearchableSelectOptions(ingredientSelectSources),
    [ingredientSelectSources],
  );

  const renderIngredientDropdownLabel = useCallback(
    (option: SearchableSelectOption) =>
      renderIngredientSearchDropdownLabel(option, ingredientByIdForSelect),
    [ingredientByIdForSelect],
  );

  const renderIngredientTriggerLabel = useCallback(
    (option: SearchableSelectOption) =>
      renderIngredientSearchTriggerLabel(option, ingredientByIdForSelect),
    [ingredientByIdForSelect],
  );

  const showCookingMemberBreakdown =
    cookingFamilyMembers.length > 1 &&
    (cookingMemberAmounts?.some((entry) => entry.amount > 0) ?? false);

  return (
    <li className="flex flex-col gap-item rounded-md border border-border bg-card p-nest transition-colors hover:bg-muted/40 hover:ring-1 hover:ring-ring">
      <div className="flex items-center gap-item md:flex-col md:items-stretch lg:flex-row lg:items-center">
        {canRenderAmountAndUnit && (
          <div className="order-1 md:order-2 lg:order-1 flex items-center gap-item md:w-full lg:w-auto">
            {isEditable ? (
              <div className="w-16 h-8 flex items-center justify-center">
                <Input
                  ref={inputRef}
                  type="number"
                  min="0.1"
                  step="any"
                  size="default"
                  value={isEditing ? editValue : displayAmount}
                  onFocus={handleFocus}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleCommit}
                  onKeyDown={handleKeyDown}
                  className="w-16 min-w-16 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label={amountAriaLabel}
                />
              </div>
            ) : (
              <div className="w-16 min-w-16 h-8 flex items-center justify-center type-body leading-none text-center tabular-nums">
                {displayAmount}
              </div>
            )}{" "}
            <Select
              value={selectedUnitId ?? undefined}
              disabled={false}
              onValueChange={(value) => onUnitChange(value || null)}
              allowInlineClear={false}
            >
              <SelectTrigger
                size="default"
                className="inline-flex items-center w-24 min-w-24 md:w-full md:min-w-0 lg:w-26 lg:min-w-26"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableUnits.map((uc) => (
                  <SelectItem key={uc.unitId} value={uc.unitId}>
                    {getUnitOptionLabel(uc.unitId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>{" "}
          </div>
        )}
        {disableIngredientSwap ? (
          <div className="order-2 md:order-1 lg:order-2 flex flex-1 min-w-0 items-center gap-item md:w-full lg:flex-1">
            <IngredientIcon icon={ingredient.icon ?? null} name={ingredientDisplayName} />
            <span className="type-body truncate">{ingredientDisplayName}</span>
          </div>
        ) : (
          <SearchableSelect
            options={ingredientOptions}
            renderLabel={renderIngredientDropdownLabel}
            renderTriggerLabel={renderIngredientTriggerLabel}
            value={ingredient.id}
            onValueChange={(next) => {
              if (!next) return;
              onIngredientChange(next);
            }}
            size="default"
            placeholder="Select ingredient..."
            searchPlaceholder="Search ingredient..."
            emptyLabel="No ingredient found."
            allowClear={false}
            className="order-2 md:order-1 lg:order-2 flex-1 min-w-0 md:w-full md:flex-none lg:flex-1 font-normal"
            renderIcon={(option) => (
              <IngredientIcon icon={option.icon ?? null} name={option.label} />
            )}
          />
        )}
      </div>

      {showCookingMemberBreakdown && cookingMemberAmounts ? (
        <IngredientMemberAmountBadges
          memberAmounts={cookingMemberAmounts}
          familyMembers={cookingFamilyMembers}
          selectedUnitId={selectedUnitId}
          baseUnitId={recipeIngredient.unit?.id ?? null}
          baseUnitName={recipeIngredient.unit?.name ?? null}
          unitConversions={ingredient.unitConversions as UnitConversionWithName[]}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-item">
        {!hidePeoplePanel ? (
          <IngredientRowActionButton
            active={showPeoplePanel}
            badgeCount={adjustmentCount}
            aria-label={`Personal adjustments for ${ingredientDisplayName}`}
            aria-expanded={showPeoplePanel}
            onClick={() => setShowPeoplePanel((prev) => !prev)}
          >
            <Users className="h-4 w-4" />
          </IngredientRowActionButton>
        ) : null}
        <IngredientRowActionButton
          active={showNotePanel}
          showDotBadge={hasNote}
          aria-label={`Note for ${ingredientDisplayName}`}
          aria-expanded={showNotePanel}
          onClick={() => setShowNotePanel((prev) => !prev)}
        >
          <NotebookPen className="h-4 w-4" />
        </IngredientRowActionButton>
        <IngredientRowActionButton
          active={showNutritionDetails}
          aria-label={`Nutrition details for ${ingredientDisplayName}`}
          aria-expanded={showNutritionDetails}
          onClick={() => setShowNutritionDetails((prev) => !prev)}
        >
          <Info className="h-4 w-4" />
        </IngredientRowActionButton>

        {ingredient.supermarketUrl && !hideSupermarketLink ? (
          <Button
            asChild
            type="button"
            variant="outline"
            size="icon-sm"
          >
            <a
              href={ingredient.supermarketUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open supermarket link for ${ingredientDisplayName}`}
              title="Open supermarket link"
            >
              <ShoppingBasket className="h-4 w-4" />
            </a>
          </Button>
        ) : null}
        {showApplyScaleAction ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onApplyScaleToAll}
            aria-label={`Scale all ingredients based on ${ingredientDisplayName}`}
            title="Apply this amount change to all ingredients"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {showPeoplePanel && !hidePeoplePanel ? (
        <IngredientMemberAdjustmentsSummary
          memberAdjustments={recipeIngredient.memberAdjustments}
          familyMembers={familyMembers}
          audienceMemberIds={audienceMemberIds}
          baseIngredientId={recipeIngredient.ingredientId}
          ingredientCatalog={catalogEntries}
          unitsById={unitsById}
          servings={recipeServings}
          memberPortions={memberPortions}
          batchAmount={recipeIngredient.amount}
          batchUnitId={recipeIngredient.unit?.id ?? null}
        />
      ) : null}

      {showNotePanel ? (
        <IngredientNotePanel
          mode="view"
          value={recipeIngredient.additionalInfo}
        />
      ) : null}

      <IngredientNutritionalInfo
        isOpen={showNutritionDetails}
        nutrition={nutrition}
        oneUnitHeader={oneUnitHeader}
        selectedAmountHeader={selectedAmountHeader}
        oneSelectedUnitNutrition={oneSelectedUnitNutrition}
        selectedAmountNutrition={selectedAmountNutrition}
      />
    </li>
  );
}
