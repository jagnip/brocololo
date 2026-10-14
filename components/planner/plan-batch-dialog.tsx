"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MealCombinationRow } from "@/components/recipes/recipe-page/meal-combination-row";
import type { PlanBatchInput } from "@/types/planner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getFamilyMemberLabel } from "@/components/planner/family-member-multi-select";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import type { CookingCombination } from "@/lib/recipes/cook-session-portions";

type PlanBatchDialogProps = {
  open: boolean;
  recipeName: string;
  alreadyCooked?: boolean;
  batch?: PlanBatchInput;
  onSave?: (batch: PlanBatchInput) => void;
  scheduledCombinations: CookingCombination[];
  familyMembers: FamilyMemberRow[];
  onOpenChange: (open: boolean) => void;
  onRemove?: () => void;
};

export function PlanBatchDialog({
  open,
  recipeName,
  alreadyCooked = false,
  batch,
  onSave,
  scheduledCombinations,
  familyMembers,
  onOpenChange,
  onRemove,
}: PlanBatchDialogProps) {
  const [storageRows, setStorageRows] = useState(batch?.storageRows ?? []);
  const canEditStorage = !alreadyCooked && batch && onSave;
  const hasChanges = JSON.stringify(storageRows) !== JSON.stringify(batch?.storageRows ?? []);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "flex max-h-[90vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0",
        canEditStorage
          ? "sm:w-[min(1000px,calc(100vw-3rem))] sm:max-w-[1000px]"
          : "sm:max-w-lg",
      )}>
        <div className="shrink-0 space-y-2 border-b px-4 py-4 md:px-6 md:py-5">
          <DialogTitle>Edit batch</DialogTitle>
          <DialogDescription>
            {recipeName}{alreadyCooked ? " \u00b7 Already cooked" : ""}
          </DialogDescription>
        </div>
        <div className={cn("min-h-0 flex-1 overflow-y-auto", canEditStorage && "grid md:grid-cols-[42%_58%]")}>
        <section className="min-w-0 px-4 py-4 md:px-6 md:py-5" aria-labelledby="batch-plan-heading">
          <h3 id="batch-plan-heading" className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            In this plan
          </h3>
          {scheduledCombinations.map((combination, index) => (
            <div
              key={`${combination.memberIds.join(",")}-${index}`}
              className="flex flex-wrap items-center gap-2 border-b py-3 first:pt-0 last:border-b-0 last:pb-0"
            >
              <span className="text-sm">
                {combination.count} {combination.count === 1 ? "meal" : "meals"} for
              </span>
              <span className="text-sm text-muted-foreground">
                {familyMembers
                  .filter((member) => combination.memberIds.includes(member.id))
                  .map((member, memberIndex) => getFamilyMemberLabel(member, memberIndex))
                  .join(" and ")}
              </span>
            </div>
          ))}
        </section>
        {canEditStorage ? (
          <section className="min-w-0 space-y-3 border-t px-4 py-4 md:border-l md:border-t-0 md:px-6 md:py-5" aria-labelledby="batch-storage-heading">
            <div className="flex items-start gap-3">
              <h3 id="batch-storage-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Storage</h3>
              <Button type="button" variant="outline" size="icon" className="-translate-y-2.5" aria-label="Add storage meals" onClick={() => setStorageRows((rows) => [...rows, { count: 1, cookingFamilyMemberIds: familyMembers.map((member) => member.id) }])}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {storageRows.length === 0 ? <p className="text-sm text-muted-foreground">No meals in storage.</p> : null}
            {storageRows.map((row, index) => (
              <MealCombinationRow
                key={index}
                rowIndex={index}
                count={row.count}
                selectedMemberIds={row.cookingFamilyMemberIds}
                familyMembers={familyMembers}
                canDelete
                onCountChange={(count) => setStorageRows((rows) => rows.map((item, i) => i === index ? { ...item, count } : item))}
                onSelectedMemberIdsChange={(cookingFamilyMemberIds) => setStorageRows((rows) => rows.map((item, i) => i === index ? { ...item, cookingFamilyMemberIds } : item))}
                onDelete={() => setStorageRows((rows) => rows.filter((_, i) => i !== index))}
              />
            ))}
          </section>
        ) : null}
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
          <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canEditStorage ? (
            <Button type="button" disabled={!hasChanges || storageRows.some((row) => row.cookingFamilyMemberIds.length === 0)} onClick={() => {
              onSave({ ...batch, storageRows });
              onOpenChange(false);
            }}>Save batch</Button>
          ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
