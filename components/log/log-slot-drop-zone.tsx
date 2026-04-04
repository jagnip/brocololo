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
    disabled: false,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-0 flex-col rounded-lg transition-colors",
        isOver ? "bg-accent/85 ring-1 ring-accent dark:bg-accent/75" : "",
      )}
    >
      {children}
    </div>
  );
}
