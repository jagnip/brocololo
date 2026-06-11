"use client";

import {
  getDisplayPercentages,
  type SharedPortionShare,
} from "@/lib/recipes/shared-portion-shares";

export type PortionSplitMember = {
  label: string;
  share: number;
  multiplier: number;
};

type PortionSplitCardProps = {
  members: PortionSplitMember[];
  /** Clarifies that the split applies to shared (“everyone”) ingredients only. */
  scopeLabel: string;
};

/** Chart-based categorical palette — see `--muted-chart-*` in globals.css */
const CATEGORY_COLOR_VARS = [
  "var(--muted-chart-1)",
  "var(--muted-chart-2)",
  "var(--muted-chart-3)",
  "var(--muted-chart-4)",
  "var(--muted-chart-5)",
] as const;

function buildConicGradient(percentages: number[]): string {
  if (percentages.length === 0) {
    return "conic-gradient(var(--muted) 0% 100%)";
  }

  let cumulative = 0;
  const stops: string[] = [];

  percentages.forEach((pct, index) => {
    const color =
      CATEGORY_COLOR_VARS[index % CATEGORY_COLOR_VARS.length];
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
          {/* Legend labels in one row; wrap on narrow widths. */}
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
                      CATEGORY_COLOR_VARS[index % CATEGORY_COLOR_VARS.length],
                  }}
                />
                <span>{member.label}</span>
                <span className="text-muted-foreground">· {percentages[index]}%</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
