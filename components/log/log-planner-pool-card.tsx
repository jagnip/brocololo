"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PlannerPoolGroupedCardData } from "@/lib/log/view-model";

export type LogPlannerPoolCardProps = {
  item: PlannerPoolGroupedCardData;
};

/** Draggable card for a grouped planner pool item on the log day view. */
export function LogPlannerPoolCard({ item }: LogPlannerPoolCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `planner-pool-${item.id}`,
      data: { type: "planner-pool-item", item },
    });

  return (
    <Card
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }}
      className="p-3 cursor-grab active:cursor-grabbing"
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{item.title}</p>
        <Badge variant="outline" className="text-xs">
          x{item.count}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {item.mealLabel} -{" "}
        {item.date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </p>
    </Card>
  );
}
