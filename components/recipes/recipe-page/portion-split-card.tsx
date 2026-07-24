"use client";

import {
  getDisplayPercentages,
  type SharedPortionShare,
} from "@/lib/recipes/shared-portion-shares";
import { formatPortionMultiplierBadgeLabel } from "@/lib/recipes/ingredient-adjustments";

export type PortionSplitMember = {
  label: string;
  share: number;
  multiplier: number;
  /**
   * Meal occasions this person eats (batch label only).
   * When set, detail is "3 ×2 portions" — count is not meals×multiplier.
   * When omitted (single meal), detail is the size multiplier only ("×2").
   */
  mealCount?: number;
};

type PortionSplitCardProps = {
  members: PortionSplitMember[];
  /** Chart title — always "Portion split" (optionally with meal count). */
  scopeLabel: string;
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

function buildConicGradient(percentages: number[]): string {
  if (percentages.length === 0) {
    return "conic-gradient(var(--muted) 0% 100%)";
  }

  let cumulative = 0;
  const stops: string[] = [];

  percentages.forEach((pct, index) => {
    const color =
      PORTION_CHART_COLOR_VARS[index % PORTION_CHART_COLOR_VARS.length];
    const end = cumulative + pct;
    stops.push(`${color} ${cumulative}% ${end}%`);
    cumulative = end;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

function buildAriaLabel(
  members: PortionSplitMember[],
  percentages: number[],
  scopeLabel: string,
): string {
  const parts = members
    .map((member, index) => `${member.label} · ${percentages[index]}%`)
    .join(", ");
  return `${scopeLabel}: ${parts}`;
}

/** Batch: "3 ×2 portions" or "3 portions". Single meal: "×2" / "×1". */
function formatMemberDetail(member: PortionSplitMember): string {
  const multiplierLabel =
    formatPortionMultiplierBadgeLabel(member.multiplier) ?? null;

  if (member.mealCount != null) {
    const portionWord = member.mealCount === 1 ? "portion" : "portions";
    if (multiplierLabel) {
      return `${member.mealCount} ${multiplierLabel} ${portionWord}`;
    }
    return `${member.mealCount} ${portionWord}`;
  }

  return multiplierLabel ?? "×1";
}

export function PortionSplitCard({ members, scopeLabel }: PortionSplitCardProps) {
  const sharesForDisplay: SharedPortionShare[] = members.map((member, index) => ({
    familyMemberId: String(index),
    share: member.share,
    multiplier: member.multiplier,
  }));
  const percentages = getDisplayPercentages(sharesForDisplay);
  const pieBackground = buildConicGradient(percentages);
  const ariaLabel = buildAriaLabel(members, percentages, scopeLabel);

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
          <div
            className="mt-tight flex flex-wrap items-center gap-x-item gap-y-tight"
            aria-hidden="true"
          >
            {members.map((member, index) => (
              <span
                key={`${member.label}-${index}`}
                className="type-caption inline-flex items-center gap-x-tight whitespace-nowrap text-foreground"
              >
                <span
                  className="inline-block size-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      PORTION_CHART_COLOR_VARS[
                        index % PORTION_CHART_COLOR_VARS.length
                      ],
                  }}
                />
                <span>
                  {member.label}{" "}
                  <span className="text-muted-foreground">
                    {formatMemberDetail(member)}
                  </span>
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
