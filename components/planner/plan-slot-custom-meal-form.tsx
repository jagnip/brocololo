"use client";

import { Input } from "@/components/ui/input";

type PlanSlotCustomMealFormProps = {
  customName: string;
  onCustomNameChange: (nextName: string) => void;
};

/** Custom meal tab — name only; ingredient rows live in the right column. */
export function PlanSlotCustomMealForm({
  customName,
  onCustomNameChange,
}: PlanSlotCustomMealFormProps) {
  return (
    <div className="space-y-2 px-4 py-4 md:px-6 md:py-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Meal name
      </p>
      {/* Full column width — no max-w so it reaches the divider. */}
      <Input
        value={customName}
        onChange={(event) => onCustomNameChange(event.target.value)}
        placeholder="e.g. Pasta from Instagram"
        className="w-full"
      />
    </div>
  );
}
