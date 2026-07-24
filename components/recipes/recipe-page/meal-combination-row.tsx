"use client";

import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { SegmentedFilterButton } from "@/components/ui/segmented-filter-button";
import { getFamilyMemberLabel } from "@/components/planner/family-member-multi-select";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { toggleCombinationMember } from "@/lib/recipes/cook-session-portions";
import { Trash2 } from "lucide-react";

type MealCombinationRowProps = {
  rowIndex: number;
  count: number;
  selectedMemberIds: string[];
  familyMembers: FamilyMemberRow[];
  /** Hide delete when this is the only remaining combination. */
  canDelete: boolean;
  onCountChange: (nextCount: number) => void;
  onSelectedMemberIdsChange: (nextIds: string[]) => void;
  onDelete: () => void;
};

/**
 * One combination row: N meal(s) for [people] — optional delete.
 * Hover matches ingredients tab: muted background + outlined trash on hover.
 */
export function MealCombinationRow({
  rowIndex,
  count,
  selectedMemberIds,
  familyMembers,
  canDelete,
  onCountChange,
  onSelectedMemberIdsChange,
  onDelete,
}: MealCombinationRowProps) {
  const selectedIdSet = new Set(selectedMemberIds);

  return (
    <div className="group/row flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] border border-border bg-card p-nest transition-colors hover:bg-muted/40 focus-within:bg-muted/40">
      <div
        className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2"
        role="group"
        aria-label={`Meal combination ${rowIndex + 1}`}
      >
        <QuantityStepper
          value={count}
          onValueChange={(next) => {
            if (next != null) {
              onCountChange(next);
            }
          }}
          min={1}
          max={99}
          editable={false}
          ariaLabel={`Number of meals for combination ${rowIndex + 1}`}
          decreaseLabel={`Decrease meals for combination ${rowIndex + 1}`}
          increaseLabel={`Increase meals for combination ${rowIndex + 1}`}
        />

        <span className="type-body text-muted-foreground shrink-0">
          {count === 1 ? "meal for" : "meals for"}
        </span>

        <div className="flex flex-wrap items-center gap-item">
          {familyMembers.map((member, index) => {
            const label = getFamilyMemberLabel(member, index);
            const isSelected = selectedIdSet.has(member.id);
            return (
              <SegmentedFilterButton
                key={member.id}
                selected={isSelected}
                aria-pressed={isSelected}
                aria-label={`${isSelected ? "Remove" : "Add"} ${label} for combination ${rowIndex + 1}`}
                onClick={() =>
                  onSelectedMemberIdsChange(
                    toggleCombinationMember(selectedMemberIds, member.id),
                  )
                }
              >
                {label}
              </SegmentedFilterButton>
            );
          })}
        </div>
      </div>

      {canDelete ? (
        // Mobile-first: always show trash. From md up, reveal on row hover/focus only.
        <div className="ml-auto shrink-0 opacity-100 pointer-events-auto transition-opacity duration-150 md:opacity-0 md:pointer-events-none md:group-hover/row:opacity-100 md:group-hover/row:pointer-events-auto md:group-focus-within/row:opacity-100 md:group-focus-within/row:pointer-events-auto md:focus-within:opacity-100 md:focus-within:pointer-events-auto">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Remove meal combination ${rowIndex + 1}`}
            title="Remove combination"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
