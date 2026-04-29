"use client";

import type { LogEditorSlotForHighlight } from "@/lib/log/is-log-recipe-card-selected";
import type { LogSlotData } from "@/lib/log/view-model";
import { LogSlots } from "./log-slots";
import { LogSlotDropZone } from "./log-slot-drop-zone";

/** One meal column for a day: label, drag target, and recipe / empty state. */
export type LogSlotProps = {
  dayKey: string;
  /** When set, the matching recipe card uses the same selected styles as recipe-page instructions. */
  editorSlot: LogEditorSlotForHighlight | null;
  slot: LogSlotData;
  onEmptyClick: () => void;
  onRecipeClick: (recipe: LogSlotData["recipes"][number]) => void;
  /** Shown only when the slot already has at least one recipe. */
  onRecipeRemove?: (recipe: LogSlotData["recipes"][number]) => void;
  onRecipeCopy?: (recipe: LogSlotData["recipes"][number]) => void;
};

export function LogSlot({
  dayKey,
  editorSlot,
  slot,
  onEmptyClick,
  onRecipeClick,
  onRecipeRemove,
  onRecipeCopy,
}: LogSlotProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <LogSlotDropZone
        dateKey={dayKey}
        mealType={slot.mealType}
        entryId={slot.entryId}
      >
        <LogSlots
          dayKey={dayKey}
          editorSlot={editorSlot}
          slot={slot}
          onEmptyClick={onEmptyClick}
          onRecipeClick={onRecipeClick}
          onRecipeRemove={
            slot.recipes.length > 0 && onRecipeRemove
              ? (recipe) => onRecipeRemove(recipe)
              : undefined
          }
          onRecipeCopy={
            slot.recipes.length > 0 && onRecipeCopy
              ? (recipe) => onRecipeCopy(recipe)
              : undefined
          }
        />
      </LogSlotDropZone>
    </div>
  );
}
