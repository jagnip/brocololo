"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";

import { IngredientIcon } from "@/components/ingredient-icon";
import {
  buildIngredientSearchSourceMap,
  ingredientsToSearchableSelectOptions,
  renderIngredientSearchDropdownLabel,
  renderIngredientSearchTriggerLabel,
} from "@/components/ingredients/ingredient-searchable-select-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import {
  SegmentedFilterButton,
  SegmentedFilterGroup,
} from "@/components/ui/segmented-filter-button";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import {
  buildDefaultModifyAdjustment,
  buildDefaultSkipAdjustment,
  canAddMemberAdjustments,
  formatDefaultPerPersonHint,
} from "@/lib/recipes/ingredient-adjustments";
import { getRecipeFamilyMemberLabel, getUnitDisplayName } from "@/lib/recipes/helpers";
import type { MemberAdjustmentRow } from "@/lib/recipes/resolve-ingredient-lines";
import type { IngredientType } from "@/types/ingredient";
import { useCallback, useMemo } from "react";

type IngredientMemberAdjustmentsEditorProps = {
  memberAdjustments: MemberAdjustmentRow[];
  onChange: (adjustments: MemberAdjustmentRow[]) => void;
  familyMembers: FamilyMemberRow[];
  audienceMemberIds: string[];
  servings: number;
  baseIngredientId: string;
  baseAmount: number | null;
  baseUnitId: string | null;
  baseUnitName: string | null;
  ingredients: IngredientType[];
};

export function IngredientMemberAdjustmentsEditor({
  memberAdjustments,
  onChange,
  familyMembers,
  audienceMemberIds,
  servings,
  baseIngredientId,
  baseAmount,
  baseUnitId,
  baseUnitName,
  ingredients,
}: IngredientMemberAdjustmentsEditorProps) {
  const isSoloHousehold = familyMembers.length <= 1;
  const canAdjust = canAddMemberAdjustments({
    ingredientId: baseIngredientId,
    amount: baseAmount,
    unitId: baseUnitId,
  });

  const audienceMembers = useMemo(
    () =>
      audienceMemberIds
        .map((id) => familyMembers.find((member) => member.id === id))
        .filter((member): member is FamilyMemberRow => member != null),
    [audienceMemberIds, familyMembers],
  );

  const usedMemberIds = useMemo(
    () => new Set(memberAdjustments.map((row) => row.familyMemberId)),
    [memberAdjustments],
  );

  const nextAvailableMember = audienceMembers.find(
    (member) => !usedMemberIds.has(member.id),
  );

  const perPersonHint = formatDefaultPerPersonHint({
    batchAmount: baseAmount,
    unitName: baseUnitName,
    servings,
  });

  const getUnitsForIngredient = (ingredientId: string | null | undefined) => {
    if (!ingredientId) return [];
    const ingredient = ingredients.find((entry) => entry.id === ingredientId);
    return ingredient?.unitConversions ?? [];
  };

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

  const updateAdjustment = (
    familyMemberId: string,
    patch: Partial<MemberAdjustmentRow>,
  ) => {
    onChange(
      memberAdjustments.map((row) =>
        row.familyMemberId === familyMemberId ? { ...row, ...patch } : row,
      ),
    );
  };

  const removeAdjustment = (familyMemberId: string) => {
    onChange(
      memberAdjustments.filter((row) => row.familyMemberId !== familyMemberId),
    );
  };

  const addAdjustment = () => {
    if (!nextAvailableMember || !canAdjust || !baseAmount || !baseUnitId) {
      return;
    }
    onChange([
      ...memberAdjustments,
      buildDefaultModifyAdjustment({
        familyMemberId: nextAvailableMember.id,
        baseIngredientId,
        baseAmount,
        baseUnitId,
        servings,
      }),
    ]);
  };

  return (
    <div className="rounded-md border border-border bg-muted/30 p-2 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Personal adjustments
      </p>

      {isSoloHousehold ? (
        <p className="type-body text-muted-foreground">
          Add family members in{" "}
          <Link href="/settings" className="text-primary underline-offset-4 hover:underline">
            Settings
          </Link>{" "}
          to adjust for others. You can still add adjustments for yourself.
        </p>
      ) : null}

      {!canAdjust ? (
        <p className="type-body text-muted-foreground">
          Add an amount and unit before creating person adjustments.
        </p>
      ) : null}

      {canAdjust && perPersonHint ? (
        <p className="font-mono text-xs text-muted-foreground">{perPersonHint}</p>
      ) : null}

      {memberAdjustments.map((adjustment) => {
        const units = getUnitsForIngredient(
          adjustment.kind === "MODIFY"
            ? adjustment.ingredientId ?? baseIngredientId
            : baseIngredientId,
        );

        return (
          <div
            key={adjustment.familyMemberId}
            className="space-y-2 rounded-md border border-border bg-card p-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={adjustment.familyMemberId}
                onValueChange={(nextMemberId) => {
                  if (!nextMemberId || nextMemberId === adjustment.familyMemberId) {
                    return;
                  }
                  if (usedMemberIds.has(nextMemberId)) {
                    return;
                  }
                  updateAdjustment(adjustment.familyMemberId, {
                    familyMemberId: nextMemberId,
                  });
                }}
              >
                <SelectTrigger className="min-w-[8rem] flex-1">
                  <SelectValue placeholder="Person" />
                </SelectTrigger>
                <SelectContent>
                  {audienceMembers.map((member, index) => {
                    const label = getRecipeFamilyMemberLabel(member, familyMembers);
                    const disabled =
                      usedMemberIds.has(member.id) &&
                      member.id !== adjustment.familyMemberId;
                    return (
                      <SelectItem
                        key={member.id}
                        value={member.id}
                        disabled={disabled}
                      >
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <SegmentedFilterGroup
                aria-label="Adjustment type"
                className="shrink-0"
              >
                <SegmentedFilterButton
                  selected={adjustment.kind === "MODIFY"}
                  size="sm"
                  onClick={() => {
                    if (adjustment.kind === "MODIFY" || !baseAmount || !baseUnitId) {
                      return;
                    }
                    updateAdjustment(
                      adjustment.familyMemberId,
                      buildDefaultModifyAdjustment({
                        familyMemberId: adjustment.familyMemberId,
                        baseIngredientId,
                        baseAmount,
                        baseUnitId,
                        servings,
                      }),
                    );
                  }}
                >
                  Modify
                </SegmentedFilterButton>
                <SegmentedFilterButton
                  selected={adjustment.kind === "SKIP"}
                  size="sm"
                  onClick={() => {
                    if (adjustment.kind === "SKIP") {
                      return;
                    }
                    updateAdjustment(
                      adjustment.familyMemberId,
                      buildDefaultSkipAdjustment(adjustment.familyMemberId),
                    );
                  }}
                >
                  Skip
                </SegmentedFilterButton>
              </SegmentedFilterGroup>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove adjustment"
                onClick={() => removeAdjustment(adjustment.familyMemberId)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {adjustment.kind === "MODIFY" ? (
              <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
                <SearchableSelect
                  options={ingredientOptions}
                  renderLabel={renderIngredientDropdownLabel}
                  renderTriggerLabel={renderIngredientTriggerLabel}
                  value={adjustment.ingredientId ?? baseIngredientId}
                  onValueChange={(next) => {
                    if (!next) return;
                    updateAdjustment(adjustment.familyMemberId, {
                      ingredientId: next,
                    });
                  }}
                  placeholder="Select ingredient..."
                  searchPlaceholder="Search ingredients..."
                  emptyLabel="No ingredient found."
                  allowClear={false}
                  className="min-w-0 flex-1"
                  renderIcon={(option) => (
                    <IngredientIcon
                      icon={option.icon ?? null}
                      name={option.label}
                      size={16}
                    />
                  )}
                />
                <Input
                  type="number"
                  min={0.01}
                  step="any"
                  placeholder="Amount"
                  value={
                    adjustment.amount == null ? "" : adjustment.amount.toString()
                  }
                  onChange={(event) => {
                    const numValue =
                      event.target.value === ""
                        ? null
                        : parseFloat(event.target.value);
                    updateAdjustment(adjustment.familyMemberId, {
                      amount: numValue,
                    });
                  }}
                  className="w-full min-w-0 md:w-24 md:flex-none"
                />
                <Select
                  value={adjustment.unitId ?? baseUnitId ?? ""}
                  onValueChange={(unitId) => {
                    updateAdjustment(adjustment.familyMemberId, {
                      unitId: unitId || null,
                    });
                  }}
                >
                  <SelectTrigger className="w-full min-w-0 md:w-32 md:flex-none">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((uc) => (
                      <SelectItem key={uc.unitId} value={uc.unitId}>
                        {getUnitDisplayName({
                          amount: adjustment.amount,
                          unitName: uc.unit.name,
                          unitNamePlural: uc.unit.namePlural ?? null,
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="type-body text-muted-foreground">
                This ingredient is not in their portion.
              </p>
            )}
          </div>
        );
      })}

      {canAdjust && nextAvailableMember ? (
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-destructive"
          onClick={addAdjustment}
        >
          + Add adjustment
        </Button>
      ) : null}
    </div>
  );
}
