"use client";

import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { MealCombinationRow } from "@/components/recipes/recipe-page/meal-combination-row";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import type { CookingCombination } from "@/lib/recipes/cook-session-portions";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

type CookingForStripeProps = {
  familyMembers: FamilyMemberRow[];
  combinations: CookingCombination[];
  onAddCombination: () => void;
  onRemoveCombination: (index: number) => void;
  onCombinationCountChange: (index: number, nextCount: number) => void;
  onCombinationMembersChange: (index: number, nextIds: string[]) => void;
  extraPortions: number;
  onExtraPortionsChange: (next: number) => void;
  className?: string;
};

/**
 * Cooking session: combination rows + extras.
 * Add next to the section title; each row is N meals for a people set.
 *
 * Terminology: a meal is one occasion; a portion is one person's share.
 */
export function CookingForStripe({
  familyMembers,
  combinations,
  onAddCombination,
  onRemoveCombination,
  onCombinationCountChange,
  onCombinationMembersChange,
  extraPortions,
  onExtraPortionsChange,
  className,
}: CookingForStripeProps) {
  const canDeleteRows = combinations.length > 1;

  return (
    <div className={cn("section-container", className)}>
      <div className="mb-item flex items-center gap-item">
        <Subheader>Cooking</Subheader>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="shrink-0"
          aria-label="Add meal combination"
          onClick={onAddCombination}
        >
          <Plus aria-hidden />
        </Button>
      </div>

      <div className="flex flex-col gap-item">
        {combinations.map((combination, index) => (
          <MealCombinationRow
            key={index}
            rowIndex={index}
            count={combination.count}
            selectedMemberIds={combination.memberIds}
            familyMembers={familyMembers}
            canDelete={canDeleteRows}
            onCountChange={(nextCount) =>
              onCombinationCountChange(index, nextCount)
            }
            onSelectedMemberIdsChange={(nextIds) =>
              onCombinationMembersChange(index, nextIds)
            }
            onDelete={() => onRemoveCombination(index)}
          />
        ))}

        {/* Same row shell + chip-height content area as meal combinations. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] border border-border bg-card p-nest">
          <div
            className="flex min-h-9 min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2"
            role="group"
            aria-label="Extra portions"
          >
            <QuantityStepper
              value={extraPortions}
              onValueChange={(next) => onExtraPortionsChange(next ?? 0)}
              min={0}
              max={99}
              editable={false}
              ariaLabel="Extra portions"
              decreaseLabel="Decrease extra portions"
              increaseLabel="Increase extra portions"
              className="shrink-0"
            />
            <span className="type-body text-muted-foreground shrink-0">
              extra portions
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
