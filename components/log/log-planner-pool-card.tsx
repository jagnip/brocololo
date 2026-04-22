"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PlannerPoolGroupedCardData } from "@/lib/log/view-model";
import { RecipeImagePlaceholder } from "@/components/recipes/recipe-image-placeholder";

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
      className={cn(
        "flex flex-row items-stretch gap-0 overflow-hidden p-0",
        "cursor-grab active:cursor-grabbing",
      )}
      {...listeners}
      {...attributes}
    >
      {/* ~1/4 width; full card height (flex cross-axis stretch). */}
      <div className="relative w-1/4 shrink-0 basis-1/4 self-stretch overflow-hidden bg-muted">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 28vw, 200px"
            quality={85}
          />
        ) : (
          // Reuse the same fallback used by other recipe image surfaces.
          <RecipeImagePlaceholder showLabel={false} />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-3">

        <p
          className="truncate text-sm font-medium leading-snug text-foreground"
          title={item.title}
        >
          {item.title}
        </p>
        <Badge variant="outline" className="w-fit text-xs tabular-nums">
          x{item.count}
        </Badge>
      </div>
    </Card>
  );
}
