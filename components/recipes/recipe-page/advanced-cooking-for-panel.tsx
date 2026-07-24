"use client";

import { useEffect, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { MealAudienceCard } from "@/components/recipes/recipe-page/meal-audience-card";
import type { FamilyMemberRow } from "@/lib/db/family-members";

type AdvancedCookingForPanelProps = {
  open: boolean;
  mealCount: number;
  familyMembers: FamilyMemberRow[];
  perMealAudience: string[][];
  onPerMealAudienceChange: (mealIndex: number, nextIds: string[]) => void;
  extraPortions: number;
  onExtraPortionsChange: (next: number) => void;
};

/**
 * Advanced cooking setup: one card per meal (who eats) + global extra portions.
 * Display-only this iteration — does not affect ingredient/nutrition math.
 */
export function AdvancedCookingForPanel({
  open,
  mealCount,
  familyMembers,
  perMealAudience,
  onPerMealAudienceChange,
  extraPortions,
  onExtraPortionsChange,
}: AdvancedCookingForPanelProps) {
  // Accordion: only one meal card open at a time.
  const [openMealIndex, setOpenMealIndex] = useState<number | null>(null);

  // Close accordion if the open meal was removed by a mealCount decrease.
  useEffect(() => {
    setOpenMealIndex((prev) =>
      prev != null && prev >= mealCount ? null : prev,
    );
  }, [mealCount]);

  return (
    <Collapsible open={open}>
      <CollapsibleContent>
        <div className="mt-3 flex flex-col gap-2">
          {Array.from({ length: mealCount }, (_, mealIndex) => {
            const selectedMemberIds =
              perMealAudience[mealIndex] ??
              familyMembers.map((member) => member.id);

            return (
              <MealAudienceCard
                key={mealIndex}
                mealIndex={mealIndex}
                familyMembers={familyMembers}
                selectedMemberIds={selectedMemberIds}
                onSelectedMemberIdsChange={(nextIds) =>
                  onPerMealAudienceChange(mealIndex, nextIds)
                }
                open={openMealIndex === mealIndex}
                onOpenChange={(nextOpen) =>
                  setOpenMealIndex(nextOpen ? mealIndex : null)
                }
              />
            );
          })}

          {/* Extra leftover / standalone portions — not tied to any meal audience. */}
          <div className="rounded-lg border border-border bg-card p-nest">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="type-body font-medium text-foreground">
                  Extra portions
                </p>
                <p className="type-caption text-muted-foreground">
                  Leftovers or freezer portions beyond the meals above
                </p>
              </div>
              <QuantityStepper
                value={extraPortions}
                onValueChange={(next) =>
                  onExtraPortionsChange(next ?? 0)
                }
                min={0}
                max={99}
                editable={false}
                ariaLabel="Extra portions"
                decreaseLabel="Decrease extra portions"
                increaseLabel="Increase extra portions"
              />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
