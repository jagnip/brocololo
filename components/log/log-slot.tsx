"use client";

import type { LogSlotData } from "@/lib/log/view-model";
import { LogPoolCard } from "./log-pool-card";
import { LogSlotDropZone } from "./log-slot-drop-zone";

/** One meal column for a day: label, drag target, and recipe / empty state. */
export type LogSlotProps = {
  dayKey: string;
  slot: LogSlotData;
  onEmptyClick: () => void;
  onRecipeClick: (recipe: LogSlotData["recipes"][number]) => void;
  /** Shown only when the slot already has at least one recipe. */
  onRecipeRemove?: () => void;
};

export function LogSlot({
  dayKey,
  slot,
  onEmptyClick,
  onRecipeClick,
  onRecipeRemove,
}: LogSlotProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{slot.label}</p>
      <LogSlotDropZone
        dateKey={dayKey}
        mealType={slot.mealType}
        entryId={slot.entryId}
      >
        <LogPoolCard
          slot={slot}
          onEmptyClick={onEmptyClick}
          onRecipeClick={onRecipeClick}
          onRecipeRemove={
            slot.recipes.length > 0 && onRecipeRemove
              ? () => onRecipeRemove()
              : undefined
          }
        />
      </LogSlotDropZone>
    </div>
  );
}
