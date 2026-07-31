"use client";

import type { FamilyMemberRow } from "@/lib/db/family-members";
import { SegmentedFilterButton } from "@/components/ui/segmented-filter-button";
import {
  getFamilyMemberLabel,
  toggleMemberIds,
} from "./family-member-multi-select";
import { cn } from "@/lib/utils";

type PlanSlotWhoEatsProps = {
  familyMembers: FamilyMemberRow[];
  value: string[];
  onChange: (nextValue: string[]) => void;
  className?: string;
};

/** Toggle chips for who this meal is cooking for — mirrors PlannerBulkEditEatersDialog. */
export function PlanSlotWhoEats({
  familyMembers,
  value,
  onChange,
  className,
}: PlanSlotWhoEatsProps) {
  // Hide entirely when the household has no members configured.
  if (familyMembers.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Cooking for
      </p>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Cooking for"
      >
        {familyMembers.map((member, index) => {
          const label = getFamilyMemberLabel(member, index + 1);
          const isSelected = value.includes(member.id);

          return (
            <SegmentedFilterButton
              key={member.id}
              selected={isSelected}
              size="sm"
              aria-pressed={isSelected}
              onClick={() => onChange(toggleMemberIds(value, member.id))}
            >
              {label}
            </SegmentedFilterButton>
          );
        })}
      </div>
    </div>
  );
}
