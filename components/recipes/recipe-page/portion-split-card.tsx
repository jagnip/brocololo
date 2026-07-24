"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getDisplayPercentages,
  getSharedPortionShares,
  type SharedPortionShare,
} from "@/lib/recipes/shared-portion-shares";
import { formatPortionMultiplierBadgeLabel } from "@/lib/recipes/ingredient-adjustments";
import { SegmentedFilterButton } from "@/components/ui/segmented-filter-button";

export type PortionSplitAudienceMember = {
  id: string;
  label: string;
  /** Household sort — keeps chart colors stable. */
  sortOrder: number;
  multiplier: number;
};

type PortionSplitCardProps = {
  /** Everyone currently selected in Cooking (chart pool). */
  members: PortionSplitAudienceMember[];
};

const SCOPE_LABEL = "Portion split per 1 meal";

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

function formatMultiplierDetail(multiplier: number): string {
  return formatPortionMultiplierBadgeLabel(multiplier) ?? "×1";
}

/**
 * Portion split for one default meal: Cooking people as the pool, click to
 * include/exclude from the pie. No batch / multi-meal view.
 */
export function PortionSplitCard({ members }: PortionSplitCardProps) {
  const memberIdsKey = members.map((member) => member.id).join(",");

  // Chart selection starts as everyone in Cooking; stays in sync when Cooking changes.
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    members.map((member) => member.id),
  );

  useEffect(() => {
    const cookingIds = memberIdsKey.length > 0 ? memberIdsKey.split(",") : [];
    const cookingSet = new Set(cookingIds);
    setSelectedIds((prev) => {
      const kept = prev.filter((id) => cookingSet.has(id));
      const newlyAdded = cookingIds.filter((id) => !prev.includes(id));
      // First sync / empty → select everyone Cooking has.
      if (prev.length === 0) {
        return cookingIds;
      }
      return [...kept, ...newlyAdded];
    });
  }, [memberIdsKey]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedMembers = useMemo(
    () => members.filter((member) => selectedIdSet.has(member.id)),
    [members, selectedIdSet],
  );

  // Multiplier-only shares for the selected subset (per 1 meal).
  const shares: SharedPortionShare[] = useMemo(() => {
    if (selectedMembers.length === 0) {
      return [];
    }
    if (selectedMembers.length === 1) {
      const only = selectedMembers[0]!;
      return [
        {
          familyMemberId: only.id,
          share: 1,
          multiplier: only.multiplier,
        },
      ];
    }
    return getSharedPortionShares(
      selectedMembers.map((member) => ({
        id: member.id,
        isSelf: false,
        sortOrder: member.sortOrder,
      })),
      selectedMembers.map((member) => ({
        familyMemberId: member.id,
        multiplier: member.multiplier,
      })),
    );
  }, [selectedMembers]);

  const percentages = getDisplayPercentages(shares);
  // Pie stop colors follow person identity in the Cooking pool (stable hues).
  const pieColorIndexes = shares.map((share) => {
    const poolIndex = members.findIndex(
      (member) => member.id === share.familyMemberId,
    );
    return poolIndex >= 0 ? poolIndex : 0;
  });
  const pieBackground = (() => {
    if (percentages.length === 0) {
      return "conic-gradient(var(--muted) 0% 100%)";
    }
    let cumulative = 0;
    const stops: string[] = [];
    percentages.forEach((pct, index) => {
      const colorIndex = pieColorIndexes[index] ?? index;
      const color =
        PORTION_CHART_COLOR_VARS[colorIndex % PORTION_CHART_COLOR_VARS.length];
      const end = cumulative + pct;
      stops.push(`${color} ${cumulative}% ${end}%`);
      cumulative = end;
    });
    return `conic-gradient(${stops.join(", ")})`;
  })();

  const ariaLabel = `${SCOPE_LABEL}: ${selectedMembers
    .map((member) => `${member.label} ${formatMultiplierDetail(member.multiplier)}`)
    .join(", ")}`;

  function toggleMember(memberId: string) {
    setSelectedIds((prev) => {
      if (prev.includes(memberId)) {
        // Keep at least one person in the chart.
        if (prev.length <= 1) {
          return prev;
        }
        return prev.filter((id) => id !== memberId);
      }
      return [...prev, memberId];
    });
  }

  if (members.length <= 1) {
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
          <div className="type-caption text-muted-foreground">{SCOPE_LABEL}</div>
          {/* Same chip toggles as Cooking — clear that people can be pressed on/off. */}
          <div
            className="mt-tight flex flex-wrap items-center gap-item"
            role="group"
            aria-label="People in portion split"
          >
            {members.map((member, index) => {
              const isSelected = selectedIdSet.has(member.id);
              return (
                <SegmentedFilterButton
                  key={member.id}
                  selected={isSelected}
                  size="sm"
                  aria-pressed={isSelected}
                  aria-label={`${isSelected ? "Hide" : "Show"} ${member.label} in portion split`}
                  onClick={() => toggleMember(member.id)}
                  // Badge-sized chip; keep text muted — selection via fill/border only
                  // (accent text reads like a category color next to the pie dots).
                  className="h-auto min-h-0 gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-muted-foreground hover:text-muted-foreground"
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
                  {member.label}{" "}
                  <span className="font-normal text-muted-foreground">
                    {formatMultiplierDetail(member.multiplier)}
                  </span>
                </SegmentedFilterButton>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
