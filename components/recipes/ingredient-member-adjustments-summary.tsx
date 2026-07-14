"use client";

import type { FamilyMemberRow } from "@/lib/db/family-members";
import {
  buildAdjustmentSummaryLines,
  buildIngredientCatalogMap,
  buildUnitsCatalogMap,
  formatDefaultPerPersonHint,
  type IngredientCatalogEntry,
  type UnitCatalogEntry,
} from "@/lib/recipes/ingredient-adjustments";
import type { MemberAdjustmentRow } from "@/lib/recipes/resolve-ingredient-lines";
import { useMemo } from "react";

type IngredientMemberAdjustmentsSummaryProps = {
  memberAdjustments: MemberAdjustmentRow[];
  familyMembers: FamilyMemberRow[];
  ingredientCatalog: IngredientCatalogEntry[];
  unitsById: Map<string, UnitCatalogEntry>;
  servings: number;
  batchAmount: number | null | undefined;
  batchUnitId: string | null | undefined;
  batchUnitName: string | null | undefined;
};

/** Read-only personal adjustments panel for recipe view. */
export function IngredientMemberAdjustmentsSummary({
  memberAdjustments,
  familyMembers,
  ingredientCatalog,
  unitsById,
  servings,
  batchAmount,
  batchUnitId,
  batchUnitName,
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
        batchAmount,
        batchUnitId,
      }),
    [
      memberAdjustments,
      familyMembers,
      catalogMap,
      unitsById,
      servings,
      batchAmount,
    ],
  );

  const perPersonHint = formatDefaultPerPersonHint({
    batchAmount,
    unitName: batchUnitName,
    servings,
  });

  return (
    <div className="rounded-md border border-border bg-muted/30 p-2 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Personal adjustments
      </p>

      {perPersonHint ? (
        <p className="font-mono text-xs text-muted-foreground">{perPersonHint}</p>
      ) : null}

      {lines.length === 0 ? (
        <p className="type-body text-muted-foreground">No personal adjustments.</p>
      ) : (
        <ul className="space-y-1">
          {lines.map((line) => (
            <li key={line.familyMemberId} className="type-body">
              <span className="font-medium text-foreground">{line.personLabel}</span>
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
