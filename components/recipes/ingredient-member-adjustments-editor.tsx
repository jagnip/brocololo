"use client";

import Link from "next/link";

import { AdjustmentPerPortionRow } from "@/components/recipes/adjustment-per-portion-row";
import { AdjustmentMemberChip } from "@/components/recipes/adjustment-member-chip";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import {
  buildDefaultModifyAdjustment,
  canAddMemberAdjustments,
  formatPortionMultiplierBadgeLabel,
  getMemberPortionMultiplier,
} from "@/lib/recipes/ingredient-adjustments";
import type { MemberPortionInput } from "@/lib/recipes/ingredient-adjustments";
import { getRecipeFamilyMemberLabel } from "@/lib/recipes/helpers";
import type { MemberAdjustmentRow } from "@/lib/recipes/resolve-ingredient-lines";
import type { IngredientType } from "@/types/ingredient";
import { useCallback, useMemo } from "react";

type IngredientMemberAdjustmentsEditorProps = {
  memberAdjustments: MemberAdjustmentRow[];
  onChange: (adjustments: MemberAdjustmentRow[]) => void;
  familyMembers: FamilyMemberRow[];
  audienceMemberIds: string[];
  servings: number;
  memberPortions?: MemberPortionInput[];
  baseIngredientId: string;
  baseAmount: number | null;
  baseUnitId: string | null;
  ingredients: IngredientType[];
  /** Resolve form validation message for a person's adjustment amount. */
  getAmountError?: (familyMemberId: string) => string | undefined;
  /** Opens the catalog ingredient edit dialog from an adjustment row. */
  onEditIngredientRequested?: (ingredientId: string) => void;
};

export function IngredientMemberAdjustmentsEditor({
  memberAdjustments,
  onChange,
  familyMembers,
  audienceMemberIds,
  servings,
  memberPortions = [],
  baseIngredientId,
  baseAmount,
  baseUnitId,
  ingredients,
  getAmountError,
  onEditIngredientRequested,
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

  const availableMembers = useMemo(
    () => audienceMembers.filter((member) => !usedMemberIds.has(member.id)),
    [audienceMembers, usedMemberIds],
  );

  const getPortionBadgeForMember = useCallback(
    (familyMemberId: string) =>
      formatPortionMultiplierBadgeLabel(
        getMemberPortionMultiplier(familyMemberId, memberPortions, familyMembers),
      ),
    [familyMembers, memberPortions],
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

  const addAdjustmentForMember = (familyMemberId: string) => {
    if (!canAdjust || !baseAmount || !baseUnitId || usedMemberIds.has(familyMemberId)) {
      return;
    }
    onChange([
      ...memberAdjustments,
      buildDefaultModifyAdjustment({
        familyMemberId,
        baseIngredientId,
        baseAmount,
        baseUnitId,
        servings,
        memberPortions,
      }),
    ]);
  };

  return (
    // Soft inset panel — same surface as IngredientNotePanel (secondary badge card).
    <div className="rounded-md bg-secondary p-nest space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Adjustments per portion
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

      {canAdjust && baseAmount != null && baseUnitId
        ? memberAdjustments.map((adjustment) => (
            <AdjustmentPerPortionRow
              key={adjustment.familyMemberId}
              adjustment={adjustment}
              familyMembers={familyMembers}
              memberPortions={memberPortions}
              servings={servings}
              baseIngredientId={baseIngredientId}
              baseAmount={baseAmount}
              baseUnitId={baseUnitId}
              ingredients={ingredients}
              amountError={getAmountError?.(adjustment.familyMemberId)}
              onEditIngredient={onEditIngredientRequested}
              onChange={(patch) =>
                updateAdjustment(adjustment.familyMemberId, patch)
              }
              onRemove={() => removeAdjustment(adjustment.familyMemberId)}
            />
          ))
        : null}

      {canAdjust && availableMembers.length > 0 ? (
        // Same pattern as Cooking for: muted instruction + outline person buttons.
        <div
          className="flex flex-wrap items-center gap-item"
          role="group"
          aria-label="Add personal adjustment"
        >
          <span className="type-body shrink-0 text-muted-foreground">
            Add for
          </span>
          {availableMembers.map((member) => {
            const label = getRecipeFamilyMemberLabel(member, familyMembers);
            return (
              <AdjustmentMemberChip
                key={member.id}
                label={label}
                portionBadgeLabel={getPortionBadgeForMember(member.id)}
                onClick={() => addAdjustmentForMember(member.id)}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
