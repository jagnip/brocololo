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
import { getFamilyMemberLabel } from "./family-member-multi-select";

type PlannerBulkEditEatersDialogProps = {
  open: boolean;
  familyMembers: FamilyMemberRow[];
  onCancel: () => void;
  onSave: (memberIds: string[]) => void;
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
  onCancel,
  onSave,
}: PlannerBulkEditEatersDialogProps) {
  const defaultMemberIds = useMemo(
    () => familyMembers.map((member) => member.id),
    [familyMembers],
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState(defaultMemberIds);

  useEffect(() => {
    if (!open) {
      return;
    }

    // Reset every time the dialog opens so bulk updates start from the agreed default.
    setSelectedMemberIds(defaultMemberIds);
  }, [defaultMemberIds, open]);

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
          <DialogTitle>Edit eaters</DialogTitle>
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
              onSave(selectedMemberIds);
            }}
          >
            Update eaters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
