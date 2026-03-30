"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import type { PlannerPoolCardData } from "@/lib/log/view-model";

type LogPlannerPoolProps = {
  items: PlannerPoolCardData[];
};

function PlannerPoolCard({ item }: { item: PlannerPoolCardData }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
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
      <p className="text-sm font-medium">{item.title}</p>
      <p className="text-xs text-muted-foreground">
        {item.mealLabel} - {item.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </p>
    </Card>
  );
}

export function LogPlannerPool({ items }: LogPlannerPoolProps) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">Planned meals</h3>
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          No planner meals left in pool.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <PlannerPoolCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

