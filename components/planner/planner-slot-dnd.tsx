"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { RecipeImagePlaceholder } from "@/components/recipes/recipe-image-placeholder";
import type { SlotInputType } from "@/types/planner";
import { getRecipeDisplayImageUrl } from "@/lib/recipes/image";

export const PLANNER_SLOT_DND_TYPE = "planner-slot" as const;

export type PlannerSlotDragData = {
  type: typeof PLANNER_SLOT_DND_TYPE;
  slotKey: string;
  title: string;
  imageUrl: string | null;
};

/** Build overlay payload from a filled slot (callers only drag filled slots). */
export function getPlannerSlotDragPreview(slot: SlotInputType): {
  title: string;
  imageUrl: string | null;
} {
  if (slot.recipe) {
    return {
      title: slot.recipe.name,
      imageUrl: getRecipeDisplayImageUrl(slot.recipe.images),
    };
  }
  return {
    title: slot.customMeal?.name ?? "Meal",
    imageUrl: null,
  };
}

type PlannerSlotDndWrapperProps = {
  slotKey: string;
  /** Filled slots are both draggable and droppable; empty are droppable only. */
  canDrag: boolean;
  title: string;
  imageUrl: string | null;
  children: React.ReactNode;
};

/**
 * Droppable (always) + optional draggable shell around a planner slot card.
 * Listeners sit on the wrapper; activation constraints on PlanView protect
 * clicks on checkboxes, links, and action buttons inside the card.
 */
export function PlannerSlotDndWrapper({
  slotKey,
  canDrag,
  title,
  imageUrl,
  children,
}: PlannerSlotDndWrapperProps) {
  const dragId = `planner-slot-${slotKey}`;
  const dragData: PlannerSlotDragData = {
    type: PLANNER_SLOT_DND_TYPE,
    slotKey,
    title,
    imageUrl,
  };

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } =
    useDraggable({
      id: dragId,
      data: dragData,
      disabled: !canDrag,
    });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: dragId,
    data: dragData,
  });

  // Same node is both drag source and drop target.
  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-full min-h-0 rounded-lg transition-colors",
        // Force grab over the card's click cursor while rearrange is enabled.
        canDrag &&
          "cursor-grab active:cursor-grabbing [&_.card-interactive]:cursor-grab [&_.card-interactive]:active:cursor-grabbing",
        // Stronger drop affordance: primary border (same weight as bulk selection).
        isOver && "bg-accent/50 ring-2 ring-primary",
        // Source stays in layout; overlay carries the visual.
        isDragging && "opacity-40 [&_.card-interactive]:hover:translate-y-0",
      )}
      {...(canDrag ? { ...listeners, ...attributes } : {})}
    >
      {children}
    </div>
  );
}

/** Compact floating preview shown under the pointer while dragging. */
export function PlannerSlotDragOverlayPreview({
  title,
  imageUrl,
}: {
  title: string;
  imageUrl: string | null;
}) {
  return (
    <Card
      className={cn(
        "pointer-events-none w-56 rotate-1 gap-0 overflow-hidden border-border p-0 shadow-xl",
        "cursor-grabbing",
      )}
    >
      <div className="relative aspect-2/1 w-full overflow-hidden bg-muted sm:aspect-3/2">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="224px"
            quality={70}
          />
        ) : (
          <RecipeImagePlaceholder showLabel={false} />
        )}
      </div>
      <p className="truncate px-card-x py-card-y text-sm font-medium leading-snug">
        {title}
      </p>
    </Card>
  );
}
