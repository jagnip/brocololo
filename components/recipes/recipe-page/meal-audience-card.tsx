"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SegmentedFilterButton } from "@/components/ui/segmented-filter-button";
import { MemberInitialAvatar } from "@/components/recipes/recipe-page/member-initial-avatar";
import { getFamilyMemberLabel } from "@/components/planner/family-member-multi-select";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

function toggleMemberIds(current: string[], memberId: string): string[] {
  const isSelected = current.includes(memberId);
  if (!isSelected) {
    return [...current, memberId];
  }
  const next = current.filter((id) => id !== memberId);
  // Each meal must include at least one person.
  return next.length === 0 ? current : next;
}

type MealAudienceCardProps = {
  mealIndex: number;
  familyMembers: FamilyMemberRow[];
  selectedMemberIds: string[];
  onSelectedMemberIdsChange: (nextIds: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** One meal in the advanced cooking panel: collapsed initials, expanded who-eats toggles. */
export function MealAudienceCard({
  mealIndex,
  familyMembers,
  selectedMemberIds,
  onSelectedMemberIdsChange,
  open,
  onOpenChange,
}: MealAudienceCardProps) {
  const selectedIdSet = new Set(selectedMemberIds);
  // Show initials in household order for the people currently on this meal.
  const selectedMembers = familyMembers.filter((member) =>
    selectedIdSet.has(member.id),
  );

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div className="rounded-lg border border-border bg-card">
        <CollapsibleTrigger
          className={cn(
            "flex w-full items-center justify-between gap-3 p-nest text-left outline-none",
            "focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:ring-inset",
          )}
          aria-label={`Meal ${mealIndex + 1}, ${selectedMembers.length} people`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="type-body font-medium text-foreground shrink-0">
              Meal {mealIndex + 1}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedMembers.map((member) => {
                const index = familyMembers.findIndex((m) => m.id === member.id);
                return (
                  <MemberInitialAvatar
                    key={member.id}
                    member={member}
                    index={index >= 0 ? index : 0}
                  />
                );
              })}
            </div>
          </div>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border px-nest pb-nest pt-3">
            <p className="type-caption text-muted-foreground mb-2">Who eats</p>
            <div
              className="flex flex-wrap items-center gap-item"
              role="group"
              aria-label={`Who eats meal ${mealIndex + 1}`}
            >
              {familyMembers.map((member, index) => {
                const label = getFamilyMemberLabel(member, index);
                const isSelected = selectedIdSet.has(member.id);
                return (
                  <SegmentedFilterButton
                    key={member.id}
                    selected={isSelected}
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? "Remove" : "Add"} ${label} for meal ${mealIndex + 1}`}
                    onClick={() =>
                      onSelectedMemberIdsChange(
                        toggleMemberIds(selectedMemberIds, member.id),
                      )
                    }
                  >
                    {label}
                  </SegmentedFilterButton>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
