"use client";

import { Badge } from "@/components/ui/badge";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import {
  getIngredientDisplay,
  getUnitDisplayName,
  type UnitConversionWithName,
} from "@/lib/recipes/helpers";
import type { CookingAggregatedMemberAmount } from "@/lib/recipes/resolve-cooking-display-lines";
import { PORTION_CHART_COLOR_VARS } from "@/components/recipes/recipe-page/portion-split-card";

type IngredientMemberAmountBadgesProps = {
  memberAmounts: CookingAggregatedMemberAmount[];
  familyMembers: FamilyMemberRow[];
  selectedUnitId: string | null;
  baseUnitId: string | null;
  baseUnitName: string | null;
  unitConversions: UnitConversionWithName[];
};

function memberLabel(member: FamilyMemberRow, index: number): string {
  return (
    member.name.trim() || (member.isSelf ? "You" : `Family member ${index + 1}`)
  );
}

/** Per-person cook-session shares for one aggregated ingredient line. */
export function IngredientMemberAmountBadges({
  memberAmounts,
  familyMembers,
  selectedUnitId,
  baseUnitId,
  baseUnitName,
  unitConversions,
}: IngredientMemberAmountBadgesProps) {
  const memberIndexById = new Map(
    familyMembers.map((member, index) => [member.id, index]),
  );

  const visibleAmounts = memberAmounts
    .filter((entry) => entry.amount > 0)
    .sort(
      (left, right) =>
        (memberIndexById.get(left.familyMemberId) ?? 0) -
        (memberIndexById.get(right.familyMemberId) ?? 0),
    );

  if (visibleAmounts.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-item">
      {visibleAmounts.map((entry) => {
        const memberIndex = memberIndexById.get(entry.familyMemberId) ?? 0;
        const member = familyMembers.find(
          (candidate) => candidate.id === entry.familyMemberId,
        );
        if (!member) {
          return null;
        }

        const display = getIngredientDisplay(
          entry.amount,
          baseUnitId,
          baseUnitName,
          selectedUnitId,
          unitConversions,
          1,
          1,
        );
        const unitLabel = getUnitDisplayName({
          amount: display.rawAmount,
          unitName: display.displayUnitName,
          unitNamePlural: display.displayUnitNamePlural,
        });
        const amountLabel =
          display.displayAmount != null
            ? `${display.displayAmount}${unitLabel ? ` ${unitLabel}` : ""}`
            : null;
        const color =
          PORTION_CHART_COLOR_VARS[
            memberIndex % PORTION_CHART_COLOR_VARS.length
          ];

        return (
          <Badge
            key={entry.familyMemberId}
            variant="secondary"
            className="gap-x-tight"
          >
            <span
              className="inline-block size-2 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <span>{memberLabel(member, memberIndex)}</span>
            {amountLabel ? (
              <span className="opacity-75">{` · ${amountLabel}`}</span>
            ) : null}
          </Badge>
        );
      })}
    </div>
  );
}
