"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedFilterButton } from "@/components/ui/segmented-filter-button";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { getFamilyMemberLabel } from "@/components/planner/family-member-multi-select";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import { cn } from "@/lib/utils";

function toggleMemberIds(current: string[], memberId: string): string[] {
  const isSelected = current.includes(memberId);
  if (!isSelected) {
    return [...current, memberId];
  }
  const next = current.filter((id) => id !== memberId);
  // Each cook session must include at least one person.
  return next.length === 0 ? current : next;
}

type CookingForStripeProps = {
  mealCount: number;
  onMealCountChange: (nextCount: number) => void;
  familyMembers: FamilyMemberRow[];
  cookingFamilyMemberIds: string[];
  onCookingFamilyMemberIdsChange: (nextIds: string[]) => void;
  className?: string;
};

/** Session control: how many meal occasions and which household members are eating. */
export function CookingForStripe({
  mealCount,
  onMealCountChange,
  familyMembers,
  cookingFamilyMemberIds,
  onCookingFamilyMemberIdsChange,
  className,
}: CookingForStripeProps) {
  const selectedIdSet = new Set(cookingFamilyMemberIds);

  return (
    <div className={cn("section-container", className)}>
      <div className="mb-item">
        <Subheader>Cooking for</Subheader>
      </div>

      {/* Match instruction / nutrition card shells on the recipe detail page. */}
      <div className="rounded-lg border border-border bg-card p-nest">
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-2"
          role="group"
          aria-label="Cooking session"
        >
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => onMealCountChange(mealCount - 1)}
              disabled={mealCount <= 1}
              aria-label="Decrease meals"
            >
              <Minus />
            </Button>
            <span
              className="type-body min-w-6 text-center tabular-nums"
              aria-live="polite"
            >
              {mealCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => onMealCountChange(mealCount + 1)}
              aria-label="Increase meals"
            >
              <Plus />
            </Button>
          </div>

          <span className="type-body text-muted-foreground shrink-0">
            {mealCount === 1 ? "meal for" : "meals for"}
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
                  aria-label={`${isSelected ? "Remove" : "Add"} ${label} from this cook session`}
                  onClick={() =>
                    onCookingFamilyMemberIdsChange(
                      toggleMemberIds(cookingFamilyMemberIds, member.id),
                    )
                  }
                >
                  {label}
                </SegmentedFilterButton>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
