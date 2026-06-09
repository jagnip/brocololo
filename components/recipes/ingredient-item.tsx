"use client";

import { RecipeType } from "@/types/recipe";
import { IngredientType } from "@/types/ingredient";
import {
  formatIngredientAmount,
  getUnitDisplayName,
  getIngredientDisplay,
  getIngredientMemberBadges,
  getIngredientNutritionPer100g,
  isGramUnit,
  scaleIngredientNutritionForGrams,
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
  ShoppingBasket,
} from "lucide-react";
import { IngredientIcon } from "../ingredient-icon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { IngredientNutritionalInfo } from "./ingredient-nutritional-info";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "../ui/searchable-select";

type IngredientItemProps = {
  recipeIngredient: RecipeType["ingredients"][number];
  replacementCandidates: IngredientType[];
  selectedUnitId: string | null;
  onUnitChange: (unitId: string | null) => void;
  servingScalingFactor: number;
  calorieScalingFactor: number;
  onAmountEdit: (ratio: number, activeCalorieScalingFactor: number) => void;
  showApplyScaleAction: boolean;
  onApplyScaleToAll: () => void;
  onIngredientChange: (ingredientId: string) => void;
  familyMembers: FamilyMemberRow[];
};

export function IngredientItem({
  recipeIngredient,
  replacementCandidates,
  selectedUnitId,
  onUnitChange,
  servingScalingFactor,
  calorieScalingFactor,
  onAmountEdit,
  showApplyScaleAction,
  onApplyScaleToAll,
  onIngredientChange,
  familyMembers,
}: IngredientItemProps) {
  const { ingredient } = recipeIngredient;
  // Resolve read-only member badges for targeted ingredients (hidden for solo households).
  const memberBadges = useMemo(
    () => getIngredientMemberBadges(recipeIngredient, familyMembers),
    [recipeIngredient, familyMembers],
  );
  const hasMemberBadges = memberBadges.length > 0;
  const hasAdditionalInfo = Boolean(recipeIngredient.additionalInfo);
  // Row 2 right: additional info and/or badges alone; both → info on row 2, badges on row 3.
  const showBadgesOnRow2 = hasMemberBadges && !hasAdditionalInfo;
  const showBadgesOnRow3 = hasMemberBadges && hasAdditionalInfo;
  const showRow2Right = hasAdditionalInfo || showBadgesOnRow2;
  const memberBadgeAriaLabel = hasMemberBadges
    ? `For ${memberBadges.map((badge) => badge.label).join(", ")}`
    : undefined;

  const memberBadgeGroup = hasMemberBadges ? (
    <div
      role="group"
      aria-label={memberBadgeAriaLabel}
      className="flex flex-wrap items-center justify-end gap-1"
    >
      {memberBadges.map((badge) => (
        <Badge key={badge.familyMemberId} variant="secondary">
          {badge.label}
        </Badge>
      ))}
    </div>
  ) : null;

  const {
    displayAmount,
    rawAmount,
    rawAmountInGrams,
    selectedUnitGramsPerUnit,
    displayUnitName,
    displayUnitNamePlural,
    availableUnits,
  } = getIngredientDisplay(
    recipeIngredient.amount,
    recipeIngredient.unit?.id ?? null,
    recipeIngredient.unit?.name ?? null,
    selectedUnitId,
    ingredient.unitConversions,
    servingScalingFactor,
    calorieScalingFactor,
  );
  // Keep selector labels and control accessibility matching the richer ingredient display.
  const ingredientDisplayName = getIngredientSelectorDisplay({
    name: ingredient.name,
    brand: ingredient.brand,
    descriptor: ingredient.descriptor,
  }).label;

  const getUnitOptionLabel = (unitId: string) => {
    // Recompute per target unit so option labels pluralize against converted amounts.
    const optionDisplay = getIngredientDisplay(
      recipeIngredient.amount,
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
  // Build macro snapshots for selected unit and currently selected amount.
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
  const [showNutritionDetails, setShowNutritionDetails] = useState(false);
  const [editValue, setEditValue] = useState("");
  const initialEditValueRef = useRef("");
  const committedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Select all text when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleFocus = () => {
    committedRef.current = false;
    // Mirror non-edit display format so the input doesn't jump from 50 -> 50.0.
    const displayed =
      rawAmount == null ? "" : formatIngredientAmount(rawAmount, 2);
    setIsEditing(true);
    setEditValue(displayed);
    initialEditValueRef.current = displayed;
  };

  const handleCommit = () => {
    // Prevent double-commit when Enter triggers blur
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

  return (
    <li className="flex flex-col gap-item rounded-2xl border border-transparent bg-muted p-4 transition-colors hover:bg-card hover:ring-1 hover:ring-ring">
      <div className="flex items-center gap-item md:flex-col md:items-stretch lg:flex-row lg:items-center">
        {/* <IngredientIcon icon={ingredient.icon} name={ingredient.name} /> */}
        {canRenderAmountAndUnit && (
          <div className="order-1 md:order-2 lg:order-1 flex items-center gap-item md:w-full lg:w-auto">
            {isEditable ? (
              /* Amount */
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
                  // Keep width compact; rely on DS defaults for spacing/typography.
                  className="w-16 min-w-16 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label={`Amount of ${ingredientDisplayName}`}
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
              // Recipe page unit selectors should not be clearable.
              allowInlineClear={false}
            >
              {/* Unit */}
              <SelectTrigger
                size="default"
                // Keep tablet fluid; slightly widen desktop unit control.
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
          // Keep layout-only overrides; spacing/typography come from the component defaults.
          className="order-2 md:order-1 lg:order-2 flex-1 min-w-0 md:w-full md:flex-none lg:flex-1 font-normal"
          renderIcon={(option) => (
            <IngredientIcon icon={option.icon ?? null} name={option.label} />
          )}
        />
      </div>
      <div className="flex items-center justify-between gap-item">
        <div className="flex shrink-0 items-center gap-item">
          <Button
            type="button"
            variant="outline"
            // Use icon size variant so global icon-color rules apply.
            size="icon-sm"
            aria-label={`Nutrition details for ${ingredientDisplayName}`}
            aria-expanded={showNutritionDetails}
            onClick={() => setShowNutritionDetails((prev) => !prev)}
          >
            <Info className="h-4 w-4" />
          </Button>
          {ingredient.supermarketUrl && (
            <Button
              asChild
              type="button"
              variant="outline"
              // Use icon size variant so global icon-color rules apply.
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
          )}
          {showApplyScaleAction && (
            <Button
              type="button"
              variant="outline"
              // Use icon size variant so global icon-color rules apply.
              size="icon-sm"
              // One-click action: apply this row's ratio to every ingredient row.
              onClick={onApplyScaleToAll}
              aria-label={`Scale all ingredients based on ${ingredientDisplayName}`}
              title="Apply this amount change to all ingredients"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {showRow2Right ? (
          <div className="ml-auto flex min-w-0 max-w-full items-center justify-end gap-item">
            {hasAdditionalInfo ? (
              <span className="text-muted-foreground type-body">
                {recipeIngredient.additionalInfo}
              </span>
            ) : null}
            {showBadgesOnRow2 ? memberBadgeGroup : null}
          </div>
        ) : null}
      </div>
      {showBadgesOnRow3 ? (
        <div className="flex justify-end">{memberBadgeGroup}</div>
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
