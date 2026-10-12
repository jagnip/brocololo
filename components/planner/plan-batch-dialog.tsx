"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { MealCombinationRow } from "@/components/recipes/recipe-page/meal-combination-row";
import { getFamilyMemberLabel } from "@/components/planner/family-member-multi-select";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import type { CookingCombination } from "@/lib/recipes/cook-session-portions";
import type { PlanBatchInput } from "@/types/planner";

type PlanBatchDialogProps = {
  open: boolean;
  recipeName: string;
  batch: PlanBatchInput;
  scheduledCombinations: CookingCombination[];
  familyMembers: FamilyMemberRow[];
  onOpenChange: (open: boolean) => void;
  onSave: (batch: PlanBatchInput) => void;
  onRemove?: () => void;
};

function audienceLabel(ids: string[], familyMembers: FamilyMemberRow[]) {
  const selected = new Set(ids);
  return familyMembers
    .filter((member) => selected.has(member.id))
    .map((member, index) => getFamilyMemberLabel(member, index))
    .join(" and ");
}

export function PlanBatchDialog({
  open,
  recipeName,
  batch,
  scheduledCombinations,
  familyMembers,
  onOpenChange,
  onSave,
  onRemove,
}: PlanBatchDialogProps) {
  const [draft, setDraft] = useState(batch);
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(batch);
  const hasEmptyAudience = draft.storageRows.some(
    (row) => row.cookingFamilyMemberIds.length === 0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[90vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:w-[min(1000px,calc(100vw-3rem))] sm:max-w-[1000px]"
      >
        <div className="shrink-0 border-b px-4 py-4 text-left md:px-6 md:py-5">
          <h2 className="text-lg font-semibold">Edit batch</h2>
          <p className="text-sm text-muted-foreground">{recipeName}</p>
        </div>

        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[42%_58%]">
          <section className="px-4 py-4 md:px-6 md:py-5" aria-labelledby="batch-plan-heading">
            <h3 id="batch-plan-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              In this plan
            </h3>
            <div>
              {scheduledCombinations.map((combination, index) => (
                <div
                  key={`${combination.memberIds.join(",")}-${index}`}
                  className="flex flex-wrap items-center gap-2 border-b py-3 last:border-b-0"
                >
                  <span className="text-sm">
                    {combination.count} {combination.count === 1 ? "meal" : "meals"} for
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {audienceLabel(combination.memberIds, familyMembers)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t px-4 py-4 md:border-l md:border-t-0 md:px-6 md:py-5" aria-labelledby="batch-storage-heading">
            <div className="mb-4 flex items-center gap-3">
              <h3 id="batch-storage-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Storage
              </h3>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Add storage meals"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    storageRows: [
                      ...current.storageRows,
                      {
                        count: 1,
                        cookingFamilyMemberIds: familyMembers.map((member) => member.id),
                      },
                    ],
                  }))
                }
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {draft.storageRows.length === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">No meals in storage.</p>
            ) : (
              <div className="space-y-3">
                {draft.storageRows.map((row, index) => (
                  <MealCombinationRow
                    key={index}
                    rowIndex={index}
                    count={row.count}
                    selectedMemberIds={row.cookingFamilyMemberIds}
                    familyMembers={familyMembers}
                    canDelete
                    onCountChange={(count) =>
                      setDraft((current) => ({
                        ...current,
                        storageRows: current.storageRows.map((item, rowIndex) =>
                          rowIndex === index ? { ...item, count } : item,
                        ),
                      }))
                    }
                    onSelectedMemberIdsChange={(cookingFamilyMemberIds) =>
                      setDraft((current) => ({
                        ...current,
                        storageRows: current.storageRows.map((item, rowIndex) =>
                          rowIndex === index
                            ? { ...item, cookingFamilyMemberIds }
                            : item,
                        ),
                      }))
                    }
                    onDelete={() =>
                      setDraft((current) => ({
                        ...current,
                        storageRows: current.storageRows.filter(
                          (_, rowIndex) => rowIndex !== index,
                        ),
                      }))
                    }
                  />
                ))}
              </div>
            )}
            {hasEmptyAudience ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                Choose at least one person for every storage row.
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[10px] border border-border bg-card p-nest transition-colors hover:bg-muted/40 focus-within:bg-muted/40">
              <QuantityStepper
                value={draft.extraPortions}
                onValueChange={(extraPortions) =>
                  setDraft((current) => ({
                    ...current,
                    extraPortions: extraPortions ?? 0,
                  }))
                }
                min={0}
                max={99}
                editable={false}
                ariaLabel="Extra portions"
                decreaseLabel="Decrease extra portions"
                increaseLabel="Increase extra portions"
              />
              <span className="text-sm text-muted-foreground">extra portions</span>
            </div>
          </section>
        </div>

        <DialogFooter className="shrink-0 flex-col items-stretch gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-end md:px-6">
          {onRemove ? (
            <Button
              type="button"
              variant="destructive"
              className="border border-destructive bg-transparent text-destructive hover:bg-destructive/10 dark:bg-transparent sm:mr-auto"
              onClick={() => {
                onRemove();
                onOpenChange(false);
              }}
            >
              Remove batch
            </Button>
          ) : null}
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!hasChanges || hasEmptyAudience}
              onClick={() => {
                onSave(draft);
                onOpenChange(false);
              }}
            >
              Save batch
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
