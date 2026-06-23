"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  WeekPicker,
  type DateRangeValue,
} from "@/components/planner/date-range-picker";

type PlanDateRangeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: DateRangeValue;
  onSave: (next: DateRangeValue) => void;
  disabled?: boolean;
};

export function PlanDateRangeDialog({
  open,
  onOpenChange,
  value,
  onSave,
  disabled = false,
}: PlanDateRangeDialogProps) {
  const [draft, setDraft] = useState<DateRangeValue>(value);

  useEffect(() => {
    if (open) {
      setDraft(value);
    }
  }, [open, value]);

  function handleSave() {
    onSave(draft);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit dates</DialogTitle>
          <DialogDescription>
            Choose the date range for this meal plan. Saving may add or remove
            days and affect tracked meals.
          </DialogDescription>
        </DialogHeader>
        <WeekPicker value={draft} onChange={setDraft} />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={disabled} onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
