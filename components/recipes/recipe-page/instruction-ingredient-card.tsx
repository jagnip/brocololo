"use client";

import { Badge, badgeVariants } from "@/components/ui/badge";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import {
  getIngredientDisplay,
  getInstructionIngredientBadgeParts,
  getUnitDisplayName,
  type InstructionIngredientBadgeInput,
  type UnitConversionWithName,
} from "@/lib/recipes/helpers";
import { PORTION_CHART_COLOR_VARS } from "@/components/recipes/recipe-page/portion-split-card";
import { COOK_SESSION_EXTRAS_SHARE_ID } from "@/lib/recipes/shared-portion-shares";
import { cn } from "@/lib/utils";

export type InstructionIngredientMemberShare = {
  /** Family member id, or `COOK_SESSION_EXTRAS_SHARE_ID` for anonymous extras. */
  familyMemberId: string;
  amount: number;
};

type InstructionIngredientCardProps = {
  badgeInput: InstructionIngredientBadgeInput;
  memberShares?: InstructionIngredientMemberShare[];
  familyMembers: FamilyMemberRow[];
  selectedUnitId: string | null;
  baseUnitId: string | null;
  baseUnitName: string | null;
  unitConversions: UnitConversionWithName[];
  showMemberBreakdown?: boolean;
  className?: string;
};

function memberInitial(member: FamilyMemberRow): string {
  const trimmed = member.name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

function formatCompactAmount(
  amount: number,
  baseUnitId: string | null,
  baseUnitName: string | null,
  selectedUnitId: string | null,
  unitConversions: UnitConversionWithName[],
): string | null {
  const display = getIngredientDisplay(
    amount,
    baseUnitId,
    baseUnitName,
    selectedUnitId,
    unitConversions,
    1,
    1,
  );

  if (display.displayAmount == null) {
    return null;
  }

  const unitLabel = getUnitDisplayName({
    amount: display.rawAmount,
    unitName: display.displayUnitName,
    unitNamePlural: display.displayUnitNamePlural,
  });
  const unitSuffix = unitLabel ? ` ${unitLabel}` : "";
  return `${display.displayAmount}${unitSuffix}`;
}

/** Tier 2 — semibold chip label (matches ingredient member badges). */
function InstructionIngredientHeader({
  badgeParts,
}: {
  badgeParts: ReturnType<typeof getInstructionIngredientBadgeParts>;
}) {
  return (
    <span className="type-caption font-semibold">
      <span>{badgeParts.ingredientName}</span>
      {badgeParts.amountUnit ? (
        <span className="pl-0.5 font-medium opacity-75">{` ${badgeParts.amountUnit}`}</span>
      ) : null}
      {badgeParts.additionalInfo ? (
        <span className="font-medium opacity-75">{` · ${badgeParts.additionalInfo}`}</span>
      ) : null}
    </span>
  );
}

/** Compact ingredient card for instruction steps — total on top, per-person shares below. */
export function InstructionIngredientCard({
  badgeInput,
  memberShares = [],
  familyMembers,
  selectedUnitId,
  baseUnitId,
  baseUnitName,
  unitConversions,
  showMemberBreakdown = false,
  className,
}: InstructionIngredientCardProps) {
  const badgeParts = getInstructionIngredientBadgeParts(badgeInput);

  const memberIndexById = new Map(
    familyMembers.map((member, index) => [member.id, index]),
  );

  const visibleShares = memberShares
    .filter((share) => share.amount > 0)
    .sort((left, right) => {
      // Extras always last, after household-ordered people.
      const leftExtras = left.familyMemberId === COOK_SESSION_EXTRAS_SHARE_ID;
      const rightExtras = right.familyMemberId === COOK_SESSION_EXTRAS_SHARE_ID;
      if (leftExtras !== rightExtras) {
        return leftExtras ? 1 : -1;
      }
      return (
        (memberIndexById.get(left.familyMemberId) ?? 0) -
        (memberIndexById.get(right.familyMemberId) ?? 0)
      );
    });

  const shouldShowMemberBreakdown =
    showMemberBreakdown && visibleShares.length > 0;

  // Compact chip — do not stretch to match tall multi-person cards in a flex row.
  if (!shouldShowMemberBreakdown) {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "h-auto self-start gap-x-tight border transition-[background-color,border-color,color,box-shadow]",
          className,
        )}
      >
        <InstructionIngredientHeader badgeParts={badgeParts} />
      </Badge>
    );
  }

  // Multi-person — grouped secondary chip; header tier 2, people tier 3.
  return (
    <div
      data-slot="badge"
      className={cn(
        badgeVariants({ variant: "secondary" }),
        // Match legacy badge interaction language when the instruction row is hovered/selected.
        "inline-flex min-w-0 flex-col items-start gap-tight rounded-md border px-nest py-tight transition-[background-color,border-color,color,box-shadow]",
        className,
      )}
    >
      <InstructionIngredientHeader badgeParts={badgeParts} />

      <div className="flex w-full flex-col gap-0.5 border-t border-secondary-foreground/15 pt-tight">
        {visibleShares.map((share) => {
          const amountLabel = formatCompactAmount(
            share.amount,
            baseUnitId,
            baseUnitName,
            selectedUnitId,
            unitConversions,
          );

          if (share.familyMemberId === COOK_SESSION_EXTRAS_SHARE_ID) {
            return (
              <div
                key={COOK_SESSION_EXTRAS_SHARE_ID}
                className="type-micro inline-flex items-center gap-x-tight font-medium opacity-75"
              >
                <span
                  className="inline-block size-1.5 shrink-0 rounded-full bg-muted-foreground"
                  aria-hidden="true"
                />
                <span>E</span>
                {amountLabel ? <span>{` · ${amountLabel}`}</span> : null}
              </div>
            );
          }

          const member = familyMembers.find(
            (entry) => entry.id === share.familyMemberId,
          );
          if (!member) {
            return null;
          }

          const memberIndex = memberIndexById.get(share.familyMemberId) ?? 0;

          return (
            <div
              key={share.familyMemberId}
              className="type-micro inline-flex items-center gap-x-tight font-medium opacity-75"
            >
              <span
                className="inline-block size-1.5 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    PORTION_CHART_COLOR_VARS[
                      memberIndex % PORTION_CHART_COLOR_VARS.length
                    ],
                }}
                aria-hidden="true"
              />
              <span>{memberInitial(member)}</span>
              {amountLabel ? <span>{` · ${amountLabel}`}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
