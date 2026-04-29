"use client";

import { useEffect, useMemo, useState } from "react";
import { LogMealType } from "@/src/generated/enums";
import { DatePicker } from "@/components/ui/date-picker-rac";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LOG_MEAL_OPTIONS = [
  { value: LogMealType.BREAKFAST, label: "Breakfast" },
  { value: LogMealType.LUNCH, label: "Lunch" },
  { value: LogMealType.SNACK, label: "Snack" },
  { value: LogMealType.DINNER, label: "Dinner" },
] as const;

type LogDuplicateEntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableDateKeys: string[];
  defaultDateKey?: string | null;
  isSubmitting: boolean;
  onSubmit: (payload: { targetDay: string; targetMealType: LogMealType }) => void;
};

export function LogDuplicateEntryDialog({
  open,
  onOpenChange,
  availableDateKeys,
  defaultDateKey,
  isSubmitting,
  onSubmit,
}: LogDuplicateEntryDialogProps) {
  const [targetDay, setTargetDay] = useState("");
  const [targetMealType, setTargetMealType] = useState<LogMealType | "">("");

  useEffect(() => {
    if (!open) {
      return;
    }
    // Default to the currently active log day; fall back to the first visible day.
    const hasDefaultDay = Boolean(
      defaultDateKey && availableDateKeys.includes(defaultDateKey),
    );
    setTargetDay(hasDefaultDay ? (defaultDateKey as string) : (availableDateKeys[0] ?? ""));
    setTargetMealType("");
  }, [availableDateKeys, defaultDateKey, open]);

  const availableDateKeySet = useMemo(
    () => new Set(availableDateKeys),
    [availableDateKeys],
  );
  const selectedDateAllowed = targetDay !== "" && availableDateKeySet.has(targetDay);
  const canSubmit = selectedDateAllowed && targetMealType !== "" && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <DatePicker
              value={targetDay}
              onChange={setTargetDay}
              disabled={isSubmitting}
              placeholder="Pick an existing log date"
              availableDateKeys={availableDateKeys}
            />
            {!selectedDateAllowed ? (
              <p className="text-xs text-destructive">
                Pick one of the existing log dates in the current range.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Meal</Label>
            <Select
              value={targetMealType}
              onValueChange={(nextValue) => {
                // Inline clear sends an empty string; keep it to restore placeholder state.
                if (nextValue === "") {
                  setTargetMealType("");
                  return;
                }
                setTargetMealType(nextValue as LogMealType);
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select meal" />
              </SelectTrigger>
              <SelectContent>
                {LOG_MEAL_OPTIONS.map((meal) => (
                  <SelectItem key={meal.value} value={meal.value}>
                    {meal.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              // Keep submit payload explicit so controller owns all side effects.
              onSubmit({ targetDay, targetMealType: targetMealType as LogMealType });
            }}
          >
            {isSubmitting ? "Duplicating..." : "Duplicate entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
