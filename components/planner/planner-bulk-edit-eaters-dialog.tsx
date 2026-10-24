"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { SegmentedFilterButton } from "@/components/ui/segmented-filter-button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { getFamilyMemberLabel } from "./family-member-multi-select";

type PlannerBulkEditEatersDialogProps = {
  open: boolean;
  familyMembers: FamilyMemberRow[];
  initialMemberIds?: string[];
  initialExtraPortions?: number | null;
  onCancel: () => void;
  onSave: ((memberIds: string[]) => void) | ((update: { memberIds: string[]; extraPortions?: number }) => void);
};

function toggleMemberIds(current: string[], memberId: string): string[] {
  const isSelected = current.includes(memberId);
  if (!isSelected) {
    return [...current, memberId];
  }

  const next = current.filter((id) => id !== memberId);
  // Keep the existing meal rule: at least one eater must remain selected.
  return next.length === 0 ? current : next;
}

export function PlannerBulkEditEatersDialog({
  open,
  familyMembers,
  initialMemberIds,
  initialExtraPortions,
  onCancel,
  onSave,
}: PlannerBulkEditEatersDialogProps) {
  const defaultMemberIds = useMemo(
    () => familyMembers.map((member) => member.id),
    [familyMembers],
  );
  const resolvedInitialMemberIds = initialMemberIds ?? defaultMemberIds;
  const [selectedMemberIds, setSelectedMemberIds] = useState(resolvedInitialMemberIds);
  const [extraPortions, setExtraPortions] = useState<number | null>(initialExtraPortions ?? null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedMemberIds(resolvedInitialMemberIds);
    setExtraPortions(initialExtraPortions ?? null);
  }, [initialExtraPortions, open, resolvedInitialMemberIds]);

  const canSave = selectedMemberIds.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Edit portions</DialogTitle>
        </DialogHeader>

        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Selected eaters"
        >
          {/* Show all available eaters at once so bulk changes are one-tap toggles. */}
          {familyMembers.map((member, index) => {
            const label = getFamilyMemberLabel(member, index + 1);
            const isSelected = selectedMemberIds.includes(member.id);

            return (
              <SegmentedFilterButton
                key={member.id}
                selected={isSelected}
                size="sm"
                aria-pressed={isSelected}
                onClick={() =>
                  setSelectedMemberIds((current) => toggleMemberIds(current, member.id))
                }
              >
                {label}
              </SegmentedFilterButton>
            );
          })}
        </div>
        {initialExtraPortions !== undefined ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Extra portions</p>
              {initialExtraPortions === null ? (
                <p className="text-xs text-muted-foreground">Mixed values stay unchanged until adjusted.</p>
              ) : null}
            </div>
            <QuantityStepper
              value={extraPortions}
              onValueChange={setExtraPortions}
              min={0}
              max={99}
              editable={false}
              ariaLabel="Extra portions"
              decreaseLabel="Decrease extra portions"
              increaseLabel="Increase extra portions"
            />
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => {
              if (!canSave) {
                return;
              }
              if (initialExtraPortions === undefined) {
                (onSave as (memberIds: string[]) => void)(selectedMemberIds);
              } else {
                (onSave as (update: { memberIds: string[]; extraPortions?: number }) => void)({
                  memberIds: selectedMemberIds,
                  ...(extraPortions != null ? { extraPortions } : {}),
                });
              }
            }}
          >
            {initialExtraPortions === undefined ? "Update eaters" : "Update portions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
