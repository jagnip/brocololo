"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { SegmentedFilterButton } from "@/components/ui/segmented-filter-button";
import { AdvancedCookingForPanel } from "@/components/recipes/recipe-page/advanced-cooking-for-panel";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import { getFamilyMemberLabel } from "@/components/planner/family-member-multi-select";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import type { AdvancedCookingMode } from "@/components/context/recipe-page-context";
import { cn } from "@/lib/utils";
import { Settings2 } from "lucide-react";

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
  advancedMode: AdvancedCookingMode;
  draftPerMealAudience: string[][];
  onDraftPerMealAudienceChange: (mealIndex: number, nextIds: string[]) => void;
  draftExtraPortions: number;
  onDraftExtraPortionsChange: (next: number) => void;
  appliedExtraPortions: number;
  appliedPersonMealSummary: string;
  onOpenAdvancedSettings: () => void;
  onDoneAdvanced: () => void;
  onResetAdvanced: () => void;
  onEditAdvanced: () => void;
  className?: string;
};

/** Session control: basic meals/people, or applied advanced cook setup. */
export function CookingForStripe({
  mealCount,
  onMealCountChange,
  familyMembers,
  cookingFamilyMemberIds,
  onCookingFamilyMemberIdsChange,
  advancedMode,
  draftPerMealAudience,
  onDraftPerMealAudienceChange,
  draftExtraPortions,
  onDraftExtraPortionsChange,
  appliedExtraPortions,
  appliedPersonMealSummary,
  onOpenAdvancedSettings,
  onDoneAdvanced,
  onResetAdvanced,
  onEditAdvanced,
  className,
}: CookingForStripeProps) {
  const selectedIdSet = new Set(cookingFamilyMemberIds);
  const isEditing = advancedMode === "editing";
  const isApplied = advancedMode === "applied";

  return (
    <div className={cn("section-container", className)}>
      {/* Header actions change by mode: Advanced settings | Done+Reset | badge+Edit+Reset */}
      <div className="mb-item flex items-center justify-between gap-3">
        <Subheader>Cooking for</Subheader>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {advancedMode === "basic" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={false}
              aria-controls="advanced-cooking-for-panel"
              onClick={onOpenAdvancedSettings}
            >
              <Settings2 className="size-3.5" aria-hidden />
              Advanced settings
            </Button>
          ) : null}

          {isEditing ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onResetAdvanced}
              >
                Reset
              </Button>
              <Button type="button" size="sm" onClick={onDoneAdvanced}>
                Done
              </Button>
            </>
          ) : null}

          {isApplied ? (
            <>
              <Badge variant="secondary">Advanced</Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-expanded={false}
                aria-controls="advanced-cooking-for-panel"
                onClick={onEditAdvanced}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onResetAdvanced}
              >
                Reset
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-nest">
        {isApplied ? (
          // Applied summary: person meal counts + meal/people controls that auto-recommit.
          <div className="flex flex-col gap-3">
            <p className="type-body text-foreground" aria-live="polite">
              {appliedPersonMealSummary}
            </p>
            {appliedExtraPortions > 0 ? (
              <p className="type-caption text-muted-foreground">
                +{appliedExtraPortions} extra portion
                {appliedExtraPortions === 1 ? "" : "s"}
              </p>
            ) : null}

            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-2"
              role="group"
              aria-label="Adjust applied cooking session"
            >
              <QuantityStepper
                value={mealCount}
                onValueChange={(next) => {
                  if (next != null) {
                    onMealCountChange(next);
                  }
                }}
                min={1}
                editable={false}
                ariaLabel="Number of meals"
                decreaseLabel="Decrease meals"
                increaseLabel="Increase meals"
              />
              <span className="type-body text-muted-foreground shrink-0">
                meals
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
                      aria-label={`${isSelected ? "Remove" : "Add"} ${label} from all meals`}
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
        ) : (
          // Basic / editing: classic meal count + people chips.
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-2"
            role="group"
            aria-label="Cooking session"
          >
            <QuantityStepper
              value={mealCount}
              onValueChange={(next) => {
                if (next != null) {
                  onMealCountChange(next);
                }
              }}
              min={1}
              editable={false}
              ariaLabel="Number of meals"
              decreaseLabel="Decrease meals"
              increaseLabel="Increase meals"
            />

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
        )}
      </div>

      <div id="advanced-cooking-for-panel">
        <AdvancedCookingForPanel
          open={isEditing}
          mealCount={mealCount}
          familyMembers={familyMembers}
          perMealAudience={draftPerMealAudience}
          onPerMealAudienceChange={onDraftPerMealAudienceChange}
          extraPortions={draftExtraPortions}
          onExtraPortionsChange={onDraftExtraPortionsChange}
        />
      </div>
    </div>
  );
}
