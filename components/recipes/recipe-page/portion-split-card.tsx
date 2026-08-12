"use client";

import { useMemo } from "react";
import {
  COOK_SESSION_EXTRAS_SHARE_ID,
  getCookSessionPortionShares,
  getDisplayPercentages,
  type SharedPortionShare,
} from "@/lib/recipes/shared-portion-shares";
import { Badge } from "@/components/ui/badge";

export type PortionSplitAudienceMember = {
  id: string;
  label: string;
  /** Household sort — keeps chart colors stable. */
  sortOrder: number;
  multiplier: number;
  /** How many meals this person appears in for this cook session. */
  mealCount: number;
};

type PortionSplitCardProps = {
  /** Everyone currently selected in Cooking (chart pool). */
  members: PortionSplitAudienceMember[];
  /** Total meal occasions across all Cooking combinations. */
  totalMealCount: number;
  /** Anonymous extra portions (default ×1 shares) from Cooking. */
  extraPortions?: number;
};

/** NomNom categorical chart hues — see `--portion-chart-*` in globals.css */
export const PORTION_CHART_COLOR_VARS = [
  "var(--portion-chart-1)",
  "var(--portion-chart-2)",
  "var(--portion-chart-3)",
  "var(--portion-chart-4)",
  "var(--portion-chart-5)",
  "var(--portion-chart-6)",
  "var(--portion-chart-7)",
  "var(--portion-chart-8)",
] as const;

const EXTRAS_SLICE_COLOR = "var(--muted-foreground)";

/** Badge text: "Nelson · 4 portions" + optional " (2x)" when multiplier ≠ 1. */
export function formatPortionSplitBadgeLabel(
  label: string,
  mealCount: number,
  multiplier: number,
): string {
  const portionWord = mealCount === 1 ? "portion" : "portions";
  const base = `${label} · ${mealCount} ${portionWord}`;
  const multiplierSuffix = formatPortionSplitMultiplierSuffix(multiplier);
  return multiplierSuffix ? `${base} ${multiplierSuffix}` : base;
}

/** "(2x)" / "(1.5x)" for non-default multipliers; null when ×1. */
export function formatPortionSplitMultiplierSuffix(
  multiplier: number,
): string | null {
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier === 1) {
    return null;
  }
  const formatted = Number.isInteger(multiplier)
    ? String(multiplier)
    : multiplier.toFixed(2).replace(/\.?0+$/, "");
  return `(${formatted}x)`;
}

function formatExtrasBadgeLabel(extraPortions: number): string {
  const portionWord = extraPortions === 1 ? "portion" : "portions";
  // Same pattern as people: "Extra · 2 portions"
  return `Extra · ${extraPortions} ${portionWord}`;
}

/**
 * Portion split for the whole cook session: read-only Cooking people + optional
 * grey extras slice. Pie weights = meals × multiplier (+ extras as ×1).
 */
export function PortionSplitCard({
  members,
  totalMealCount,
  extraPortions = 0,
}: PortionSplitCardProps) {
  const scopeLabel = `Portion split for this cook (${totalMealCount} ${
    totalMealCount === 1 ? "meal" : "meals"
  })`;

  const personMealCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of members) {
      counts.set(member.id, member.mealCount);
    }
    return counts;
  }, [members]);

  // Cook-session shares for everyone in Cooking (+ optional extras).
  const shares: SharedPortionShare[] = useMemo(
    () =>
      getCookSessionPortionShares({
        audienceMembers: members.map((member) => ({
          id: member.id,
          isSelf: false,
          sortOrder: member.sortOrder,
        })),
        memberPortions: members.map((member) => ({
          familyMemberId: member.id,
          multiplier: member.multiplier,
        })),
        personMealCounts,
        extraPortions,
      }),
    [extraPortions, members, personMealCounts],
  );

  const percentages = getDisplayPercentages(shares);

  // Person slice colors follow Cooking-pool order; extras use muted grey.
  const pieColorValues = shares.map((share) => {
    if (share.familyMemberId === COOK_SESSION_EXTRAS_SHARE_ID) {
      return EXTRAS_SLICE_COLOR;
    }
    const poolIndex = members.findIndex(
      (member) => member.id === share.familyMemberId,
    );
    const colorIndex = poolIndex >= 0 ? poolIndex : 0;
    return PORTION_CHART_COLOR_VARS[colorIndex % PORTION_CHART_COLOR_VARS.length];
  });

  const pieBackground = (() => {
    if (percentages.length === 0) {
      return "conic-gradient(var(--muted) 0% 100%)";
    }
    let cumulative = 0;
    const stops: string[] = [];
    percentages.forEach((pct, index) => {
      const color = pieColorValues[index] ?? "var(--muted)";
      const end = cumulative + pct;
      stops.push(`${color} ${cumulative}% ${end}%`);
      cumulative = end;
    });
    return `conic-gradient(${stops.join(", ")})`;
  })();

  const personBadgeLabels = members.map((member) =>
    formatPortionSplitBadgeLabel(member.label, member.mealCount, member.multiplier),
  );
  const extrasBadgeLabel =
    extraPortions > 0 ? formatExtrasBadgeLabel(extraPortions) : null;
  const ariaLabel = [
    scopeLabel,
    ...personBadgeLabels,
    ...(extrasBadgeLabel ? [extrasBadgeLabel] : []),
  ].join(": ");

  // Nothing useful to show (no people and no extras).
  if (members.length === 0 && extraPortions <= 0) {
    return null;
  }

  return (
    <div className="mb-item rounded-lg border border-border bg-card p-nest">
      <div className="flex items-start gap-item">
        <div
          className="relative size-10 shrink-0 rounded-full border border-border"
          style={{ backgroundImage: pieBackground }}
          role="img"
          aria-label={ariaLabel}
        />

        <div className="min-w-0 flex-1">
          <div className="type-caption text-muted-foreground">{scopeLabel}</div>
          {/* Read-only mirrors of Cooking — not interactive. */}
          <div
            className="mt-tight flex flex-wrap items-center gap-item"
            role="list"
            aria-label="People in portion split"
          >
            {members.map((member, index) => {
              const portionWord =
                member.mealCount === 1 ? "portion" : "portions";
              const multiplierSuffix = formatPortionSplitMultiplierSuffix(
                member.multiplier,
              );
              // Name keeps badge semibold; portion detail is muted like other outline badges.
              const detail = ` · ${member.mealCount} ${portionWord}${
                multiplierSuffix ? ` ${multiplierSuffix}` : ""
              }`;
              return (
                <Badge
                  key={member.id}
                  role="listitem"
                  variant="outline"
                  className="gap-x-tight"
                >
                  <span
                    className="inline-block size-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        PORTION_CHART_COLOR_VARS[
                          index % PORTION_CHART_COLOR_VARS.length
                        ],
                    }}
                    aria-hidden
                  />
                  <span>{member.label}</span>
                  <span className="font-normal opacity-75">{detail}</span>
                </Badge>
              );
            })}
            {extraPortions > 0 ? (
              <Badge
                role="listitem"
                variant="outline"
                className="gap-x-tight"
              >
                <span
                  className="inline-block size-2 shrink-0 rounded-full bg-muted-foreground"
                  aria-hidden
                />
                {/* Match person badges: bold label + muted “· N portions”. */}
                <span>Extra</span>
                <span className="font-normal opacity-75">
                  {` · ${extraPortions} ${
                    extraPortions === 1 ? "portion" : "portions"
                  }`}
                </span>
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
