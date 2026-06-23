"use client";

import { useCallback, useState } from "react";
import { GripVertical } from "lucide-react";
import { moveCategoryIdToIndex } from "@/lib/groceries/layout-category-order";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GroceriesLayoutCategoryItem = {
  id: string;
  name: string;
};

type GroceriesLayoutCategoryListProps = {
  categories: GroceriesLayoutCategoryItem[];
  orderedCategoryIds: string[];
  onOrderChange: (nextOrder: string[]) => void;
  disabled?: boolean;
};

/** Vertical drag-and-drop list for reordering supermarket aisle categories. */
export function GroceriesLayoutCategoryList({
  categories,
  orderedCategoryIds,
  onOrderChange,
  disabled = false,
}: GroceriesLayoutCategoryListProps) {
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);
  const [activeDropIndex, setActiveDropIndex] = useState<number | null>(null);

  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const orderedCategories = orderedCategoryIds
    .map((id) => categoriesById.get(id))
    .filter((category): category is GroceriesLayoutCategoryItem => Boolean(category));
  const missingCategories = categories.filter(
    (category) => !orderedCategoryIds.includes(category.id),
  );
  const displayCategories = [...orderedCategories, ...missingCategories];

  const onDropToIndex = useCallback(
    (targetIndex: number) => {
      if (!draggingCategoryId) return;
      onOrderChange(
        moveCategoryIdToIndex({
          categoryIds: displayCategories.map((category) => category.id),
          movedCategoryId: draggingCategoryId,
          targetIndex,
        }),
      );
      setActiveDropIndex(null);
      setDraggingCategoryId(null);
    },
    [displayCategories, draggingCategoryId, onOrderChange],
  );

  const renderDropSlot = (targetIndex: number) => {
    const isDragging = Boolean(draggingCategoryId) && !disabled;
    const isActiveSlot = activeDropIndex === targetIndex;
    return (
      <div key={`drop-${targetIndex}`} className="relative h-0 w-full shrink-0 overflow-visible">
        <div
          className={cn(
            "absolute left-0 right-0 top-0 z-10 -translate-y-1/2 rounded border border-dashed transition-colors",
            isDragging
              ? "pointer-events-auto h-8 border-muted-foreground/30 bg-muted/30"
              : "pointer-events-none h-px border-transparent bg-transparent",
            isActiveSlot && isDragging && "border-primary/70 bg-primary/10",
          )}
          onDragOver={(event) => {
            if (!isDragging) return;
            event.preventDefault();
            setActiveDropIndex(targetIndex);
          }}
          onDragEnter={(event) => {
            if (!isDragging) return;
            event.preventDefault();
            setActiveDropIndex(targetIndex);
          }}
          onDragLeave={() => {
            if (activeDropIndex === targetIndex) {
              setActiveDropIndex(null);
            }
          }}
          onDrop={(event) => {
            if (!isDragging) return;
            event.preventDefault();
            onDropToIndex(targetIndex);
          }}
          aria-hidden
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {renderDropSlot(0)}
      {displayCategories.map((category, index) => (
        <div key={category.id}>
          <div
            className={cn(
              "flex items-center gap-2 rounded-md border bg-card px-3 py-2",
              index < displayCategories.length - 1 && "mb-item",
              draggingCategoryId === category.id && "opacity-60",
            )}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 cursor-grab active:cursor-grabbing"
              aria-label={`Drag ${category.name}`}
              disabled={disabled}
              draggable={!disabled}
              onDragStart={(event) => {
                event.stopPropagation();
                setDraggingCategoryId(category.id);
              }}
              onDragEnd={() => {
                setActiveDropIndex(null);
                setDraggingCategoryId(null);
              }}
            >
              <GripVertical className="h-4 w-4" aria-hidden />
            </Button>
            <span className="min-w-0 flex-1 text-sm font-medium">{category.name}</span>
          </div>
          {renderDropSlot(index + 1)}
        </div>
      ))}
    </div>
  );
}
