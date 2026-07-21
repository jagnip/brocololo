"use client";

import type { FamilyMemberRow } from "@/lib/db/family-members";
import {
  buildAdjustmentSummaryLines,
  buildIngredientCatalogMap,
  buildPortionSizeSummaryRows,
  buildUnitsCatalogMap,
  shouldShowPortionShareSummary,
  type IngredientCatalogEntry,
  type MemberPortionInput,
  type UnitCatalogEntry,
} from "@/lib/recipes/ingredient-adjustments";
import type { MemberAdjustmentRow } from "@/lib/recipes/resolve-ingredient-lines";
import { useMemo } from "react";
import { AdjustmentMemberChip } from "@/components/recipes/adjustment-member-chip";

type IngredientMemberAdjustmentsSummaryProps = {
  memberAdjustments: MemberAdjustmentRow[];
  familyMembers: FamilyMemberRow[];
  audienceMemberIds: string[];
  baseIngredientId: string;
  ingredientCatalog: IngredientCatalogEntry[];
  unitsById: Map<string, UnitCatalogEntry>;
  servings: number;
  memberPortions?: MemberPortionInput[];
  /** Stored recipe batch amount — not display-scaled (matches log pool). */
  batchAmount: number | null | undefined;
  batchUnitId: string | null | undefined;
};

/** Read-only personal adjustments panel for recipe view. */
export function IngredientMemberAdjustmentsSummary({
  memberAdjustments,
  familyMembers,
  audienceMemberIds,
  baseIngredientId,
  ingredientCatalog,
  unitsById,
  servings,
  memberPortions = [],
  batchAmount,
  batchUnitId,
}: IngredientMemberAdjustmentsSummaryProps) {
  const catalogMap = useMemo(
    () => buildIngredientCatalogMap(ingredientCatalog),
    [ingredientCatalog],
  );

  const lines = useMemo(
    () =>
      buildAdjustmentSummaryLines({
        memberAdjustments,
        familyMembers,
        ingredientCatalog: catalogMap,
        unitsById,
        servings,
        baseIngredientId,
        batchAmount,
        batchUnitId,
        memberPortions,
        audienceMemberIds,
      }),
    [
      memberAdjustments,
      familyMembers,
      catalogMap,
      unitsById,
      servings,
      baseIngredientId,
      batchAmount,
      batchUnitId,
      memberPortions,
      audienceMemberIds,
    ],
  );

  const adjustedMemberIds = useMemo(
    () => memberAdjustments.map((row) => row.familyMemberId),
    [memberAdjustments],
  );

  const portionRows = useMemo(
    () =>
      buildPortionSizeSummaryRows({
        familyMembers,
        audienceMemberIds,
        memberPortions,
        baseIngredientId,
        batchAmount,
        batchUnitId,
        memberAdjustments,
        servings,
        unitsById,
        excludeAdjustedMemberIds: adjustedMemberIds,
      }),
    [
      familyMembers,
      audienceMemberIds,
      memberPortions,
      baseIngredientId,
      batchAmount,
      batchUnitId,
      memberAdjustments,
      servings,
      unitsById,
      adjustedMemberIds,
    ],
  );

  const showPortionSizes = shouldShowPortionShareSummary({
    audienceMemberIds,
    batchAmount,
    batchUnitId,
    memberAdjustments,
  });

  return (
    // Soft inset panel — same surface as IngredientNotePanel (secondary badge card).
    <div className="rounded-md bg-secondary p-nest space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Adjustments per portion
      </p>

      {showPortionSizes ? (
        <div className="space-y-1.5">
          <p className="type-caption text-muted-foreground">
            Portion sizes (shared split)
          </p>
          <ul className="space-y-1">
            {portionRows.map((row) => (
              <li key={row.familyMemberId} className="type-body">
                <AdjustmentMemberChip
                  label={row.personLabel}
                  portionBadgeLabel={row.portionBadgeLabel}
                />
                {row.shareDetail ? (
                  <>
                    <span className="text-muted-foreground"> — </span>
                    <span className="text-foreground">{row.shareDetail}</span>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {lines.length === 0 ? (
        <p className="type-body text-muted-foreground">
          No adjustments per portion for this ingredient.
        </p>
      ) : (
        <ul className="space-y-1">
          {lines.map((line) => (
            <li key={line.familyMemberId} className="type-body">
              <AdjustmentMemberChip
                label={line.personLabel}
                portionBadgeLabel={line.portionBadgeLabel}
                adjustmentBadgeLabel={line.adjustmentBadgeLabel}
              />
              <span className="text-muted-foreground">
                {" "}
                — {line.kind === "MODIFY" ? "Modify" : "Skip"} →{" "}
              </span>
              <span className="text-foreground">{line.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { buildUnitsCatalogMap };
