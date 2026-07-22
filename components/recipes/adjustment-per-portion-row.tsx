"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { IngredientIcon } from "@/components/ingredient-icon";
import {
  buildIngredientSearchSourceMap,
  ingredientsToSearchableSelectOptions,
  renderIngredientSearchDropdownLabel,
  renderIngredientSearchTriggerLabel,
} from "@/components/ingredients/ingredient-searchable-select-labels";
import { Button } from "@/components/ui/button";
import { getSegmentedFilterSurfaceClassName } from "@/components/ui/segmented-filter-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type SearchableSelectOption } from "@/components/ui/searchable-select";
import { SearchableSelectWithAction } from "@/components/ui/searchable-select-with-action";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import {
  buildDefaultModifyAdjustment,
  buildDefaultSkipAdjustment,
  formatPortionMultiplierBadgeLabel,
  getDefaultModifyAmountForMember,
  getDefaultPerPersonAmount,
  getMemberPortionMultiplier,
} from "@/lib/recipes/ingredient-adjustments";
import type { MemberPortionInput } from "@/lib/recipes/ingredient-adjustments";
import {
  formatIngredientAmount,
  getRecipeFamilyMemberLabel,
  getUnitDisplayName,
} from "@/lib/recipes/helpers";
import type { MemberAdjustmentRow } from "@/lib/recipes/resolve-ingredient-lines";
import type { IngredientType } from "@/types/ingredient";
import { ADJUSTMENT_AMOUNT_REQUIRED_MESSAGE } from "@/lib/validations/recipe";
import { cn } from "@/lib/utils";

type AdjustmentPerPortionRowProps = {
  adjustment: MemberAdjustmentRow;
  familyMembers: FamilyMemberRow[];
  memberPortions?: MemberPortionInput[];
  servings: number;
  baseIngredientId: string;
  baseAmount: number;
  baseUnitId: string;
  ingredients: IngredientType[];
  /** Form-level validation (e.g. on save). */
  amountError?: string;
  /** Opens the catalog ingredient edit dialog (same as main ingredient row). */
  onEditIngredient?: (ingredientId: string) => void;
  onChange: (patch: Partial<MemberAdjustmentRow>) => void;
  onRemove: () => void;
};

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.0001;
}

function formatAmountInputValue(amount: number | null | undefined): string {
  if (amount == null) return "";
  return amount.toString();
}

/** Auto total + optional breakdown, e.g. 100g and (50g × 2). */
function formatAutoAmountHint(input: {
  batchAmount: number;
  servings: number;
  familyMemberId: string;
  memberPortions?: MemberPortionInput[];
  familyMembers: FamilyMemberRow[];
  unitName: string;
}): { total: string; breakdown: string | null } | null {
  const autoTotal = getDefaultModifyAmountForMember({
    batchAmount: input.batchAmount,
    servings: input.servings,
    familyMemberId: input.familyMemberId,
    memberPortions: input.memberPortions,
  });
  const basePerPerson = getDefaultPerPersonAmount(input.batchAmount, input.servings);
  if (autoTotal == null || basePerPerson == null || !input.unitName) {
    return null;
  }

  const unitLabel = getUnitDisplayName({
    amount: autoTotal,
    unitName: input.unitName,
  });
  const total = `${formatIngredientAmount(autoTotal)}${unitLabel}`;

  const multiplier = getMemberPortionMultiplier(
    input.familyMemberId,
    input.memberPortions,
    input.familyMembers,
  );
  const multiplierLabel = formatPortionMultiplierBadgeLabel(multiplier);
  if (!multiplierLabel) {
    return { total, breakdown: null };
  }

  const baseUnitLabel = getUnitDisplayName({
    amount: basePerPerson,
    unitName: input.unitName,
  });
  const breakdown = `(${formatIngredientAmount(basePerPerson)}${baseUnitLabel} ${multiplierLabel})`;
  return { total, breakdown };
}

/**
 * One person’s portion adjustment — single row:
 * Name · ingredient · auto hint → amount · unit · Skip · delete.
 */
export function AdjustmentPerPortionRow({
  adjustment,
  familyMembers,
  memberPortions = [],
  servings,
  baseIngredientId,
  baseAmount,
  baseUnitId,
  ingredients,
  amountError,
  onEditIngredient,
  onChange,
  onRemove,
}: AdjustmentPerPortionRowProps) {
  const isSkipped = adjustment.kind === "SKIP";
  const activeIngredientId =
    adjustment.kind === "MODIFY"
      ? adjustment.ingredientId ?? baseIngredientId
      : baseIngredientId;

  const units = useMemo(() => {
    const ingredient = ingredients.find((entry) => entry.id === activeIngredientId);
    return ingredient?.unitConversions ?? [];
  }, [activeIngredientId, ingredients]);

  const unitId = adjustment.unitId ?? baseUnitId;
  const selectedUnit = units.find((entry) => entry.unitId === unitId)?.unit;
  const unitName = selectedUnit?.name ?? "";

  const autoHint = useMemo(
    () =>
      formatAutoAmountHint({
        batchAmount: baseAmount,
        servings,
        familyMemberId: adjustment.familyMemberId,
        memberPortions,
        familyMembers,
        unitName,
      }),
    [
      adjustment.familyMemberId,
      baseAmount,
      familyMembers,
      memberPortions,
      servings,
      unitName,
    ],
  );

  // Local text while typing — avoids number-input backspace quirks and auto-amount snap-back.
  const [amountText, setAmountText] = useState(() =>
    isSkipped ? "0" : formatAmountInputValue(adjustment.amount),
  );
  const isAmountFocusedRef = useRef(false);
  const savedAmountRef = useRef<number | null>(adjustment.amount ?? null);
  const [localAmountError, setLocalAmountError] = useState<string | null>(null);

  useEffect(() => {
    if (isAmountFocusedRef.current) return;
    setAmountText(
      isSkipped ? "0" : formatAmountInputValue(adjustment.amount),
    );
  }, [adjustment.amount, adjustment.kind, adjustment.familyMemberId, isSkipped]);

  useEffect(() => {
    if (isSkipped) {
      setLocalAmountError(null);
    }
  }, [isSkipped]);

  const displayAmountError = amountError ?? localAmountError;

  const restoreSavedAmount = () => {
    const restored = savedAmountRef.current;
    setAmountText(formatAmountInputValue(restored));
    onChange({ kind: "MODIFY", amount: restored });
  };

  const commitAmountText = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "") {
      setLocalAmountError(ADJUSTMENT_AMOUNT_REQUIRED_MESSAGE);
      setAmountText("");
      onChange({ kind: "MODIFY", amount: null });
      return;
    }
    const numValue = parseFloat(trimmed);
    if (Number.isNaN(numValue)) {
      restoreSavedAmount();
      return;
    }
    setLocalAmountError(null);
    setAmountText(numValue.toString());
    onChange({ kind: "MODIFY", amount: numValue });
  };

  const autoAmount = getDefaultModifyAmountForMember({
    batchAmount: baseAmount,
    servings,
    familyMemberId: adjustment.familyMemberId,
    memberPortions,
  });

  // Input shows stored amount only — never fall back to auto (that blocks backspace/clear).
  const resolvedAmountForDisplay =
    isSkipped ? 0 : adjustment.amount ?? autoAmount ?? null;

  const isOverridden =
    !isSkipped &&
    adjustment.kind === "MODIFY" &&
    adjustment.amount != null &&
    autoAmount != null &&
    !amountsMatch(adjustment.amount, autoAmount);

  // Skip and manual override retire the auto hint.
  const strikeAutoHint = isSkipped || isOverridden;

  const personLabel = getRecipeFamilyMemberLabel(
    familyMembers.find((member) => member.id === adjustment.familyMemberId) ??
      ({ id: adjustment.familyMemberId, name: "", isSelf: false } as FamilyMemberRow),
    familyMembers,
  );

  const ingredientSelectSources = useMemo(
    () =>
      ingredients.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        brand: candidate.brand,
        descriptor: candidate.descriptor,
        icon: candidate.icon,
        category: candidate.category ?? null,
      })),
    [ingredients],
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

  const handleSkip = () => {
    if (isSkipped) {
      onChange(
        buildDefaultModifyAdjustment({
          familyMemberId: adjustment.familyMemberId,
          baseIngredientId,
          baseAmount,
          baseUnitId,
          servings,
          memberPortions,
        }),
      );
      return;
    }
    onChange(buildDefaultSkipAdjustment(adjustment.familyMemberId));
  };

  return (
    <div
      className={cn(
        // Phone: select / values / buttons. sm+: wrap by space — buttons first, then values with buttons.
        "flex flex-col gap-item rounded-md border border-border bg-card p-nest",
        "sm:flex-row sm:flex-wrap sm:items-start",
      )}
    >
      {/* Name + select — protected floor so the fused control stays readable. */}
      <div className="flex min-w-0 w-full items-start gap-3 sm:min-w-72 sm:flex-1">
        <span className="shrink-0 type-body font-medium leading-9 text-foreground">
          {personLabel}
        </span>

        <SearchableSelectWithAction
          options={ingredientOptions}
          renderLabel={renderIngredientDropdownLabel}
          renderTriggerLabel={renderIngredientTriggerLabel}
          value={activeIngredientId}
          onValueChange={(next) => {
            if (!next || isSkipped) return;
            onChange({ ingredientId: next });
          }}
          placeholder="Select ingredient..."
          searchPlaceholder="Search ingredients..."
          emptyLabel="No ingredient found."
          allowClear={false}
          disabled={isSkipped}
          className="min-w-0 flex-1"
          renderIcon={(option) => (
            <IngredientIcon icon={option.icon ?? null} name={option.label} size={16} />
          )}
          actionAriaLabel="Edit ingredient"
          actionIcon={<Pencil className="h-4 w-4" />}
          actionDisabled={isSkipped || !activeIngredientId || !onEditIngredient}
          onActionClick={() => {
            if (!activeIngredientId || isSkipped) return;
            onEditIngredient?.(activeIngredientId);
          }}
        />
      </div>

      {/* Auto hint + amount + unit — wrap as one group onto the buttons row when space is tighter. */}
      <div className="flex w-full shrink-0 flex-wrap items-start gap-item sm:w-auto">
        {autoHint ? (
          <div
            className={cn(
              "flex h-9 shrink-0 flex-wrap items-center gap-1 type-body tabular-nums",
              strikeAutoHint && "text-muted-foreground line-through",
            )}
            aria-hidden
          >
            <span>{autoHint.total}</span>
            {autoHint.breakdown ? (
              <span className="text-muted-foreground">{autoHint.breakdown}</span>
            ) : null}
            <span className="text-muted-foreground">→</span>
          </div>
        ) : null}

        {/* Error sits under the amount field only. */}
        <div className="flex w-24 shrink-0 flex-col gap-1">
          <Input
            type="text"
            inputMode="decimal"
            disabled={isSkipped}
            value={amountText}
            aria-invalid={!!displayAmountError}
            onFocus={() => {
              isAmountFocusedRef.current = true;
              savedAmountRef.current = adjustment.amount ?? null;
            }}
            onBlur={() => {
              isAmountFocusedRef.current = false;
              commitAmountText(amountText);
            }}
            onChange={(event) => {
              if (isSkipped) return;
              const raw = event.target.value;
              setAmountText(raw);
              if (raw.trim() === "") {
                onChange({ kind: "MODIFY", amount: null });
                return;
              }
              const numValue = parseFloat(raw);
              if (Number.isNaN(numValue)) return;
              setLocalAmountError(null);
              onChange({ kind: "MODIFY", amount: numValue });
            }}
            className="h-9 w-full min-w-0 tabular-nums"
            aria-label={`Amount for ${personLabel}`}
            aria-describedby={
              displayAmountError ? `amount-error-${adjustment.familyMemberId}` : undefined
            }
          />
          {displayAmountError ? (
            <p
              id={`amount-error-${adjustment.familyMemberId}`}
              className="text-destructive text-sm"
            >
              {displayAmountError}
            </p>
          ) : null}
        </div>

        <Select
          value={unitId}
          disabled={isSkipped}
          onValueChange={(nextUnitId) => {
            if (isSkipped) return;
            onChange({ unitId: nextUnitId || null });
          }}
        >
          <SelectTrigger className="h-9 w-28 shrink-0">
            <SelectValue placeholder="Unit" />
          </SelectTrigger>
          <SelectContent>
            {units.map((uc) => (
              <SelectItem key={uc.unitId} value={uc.unitId}>
                {getUnitDisplayName({
                  amount: resolvedAmountForDisplay,
                  unitName: uc.unit.name,
                  unitNamePlural: uc.unit.namePlural ?? null,
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Skip + delete — wrap together first when the select needs room. */}
      <div className="flex shrink-0 items-center gap-item">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-9 shrink-0", getSegmentedFilterSurfaceClassName(isSkipped))}
          onClick={handleSkip}
          aria-pressed={isSkipped}
        >
          Skip
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          aria-label={`Remove adjustment for ${personLabel}`}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
