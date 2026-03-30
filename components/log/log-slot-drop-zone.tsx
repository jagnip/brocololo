"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { LogMealType } from "@/src/generated/enums";

type LogSlotDropZoneProps = {
  dateKey: string;
  mealType: LogMealType;
  entryId?: string;
  children: React.ReactNode;
};

export function LogSlotDropZone({ dateKey, mealType, entryId, children }: LogSlotDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `log-slot-${dateKey}-${mealType}`,
    data: {
      type: "log-slot",
      dateKey,
      mealType,
      entryId,
    },
    disabled: !entryId,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg transition-colors",
        isOver && entryId ? "bg-accent/30 ring-1 ring-accent" : "",
      )}
    >
      {children}
    </div>
  );
}

