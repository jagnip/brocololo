"use client";

import { useMemo } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
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

type SortableCategoryRowProps = {
  category: GroceriesLayoutCategoryItem;
  disabled: boolean;
  isLast: boolean;
};

function SortableCategoryRow({ category, disabled, isLast }: SortableCategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: category.id,
      disabled,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-card px-3 py-2",
        !isLast && "mb-item",
        isDragging && "opacity-60",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 cursor-grab touch-none active:cursor-grabbing"
        aria-label={`Drag ${category.name}`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </Button>
      <span className="min-w-0 flex-1 text-sm font-medium">{category.name}</span>
    </div>
  );
}

/** Vertical drag-and-drop list for reordering supermarket aisle categories. */
export function GroceriesLayoutCategoryList({
  categories,
  orderedCategoryIds,
  onOrderChange,
  disabled = false,
}: GroceriesLayoutCategoryListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const displayCategoryIds = useMemo(() => {
    const orderedCategories = orderedCategoryIds
      .map((id) => categoriesById.get(id))
      .filter((category): category is GroceriesLayoutCategoryItem => Boolean(category));
    const missingCategories = categories.filter(
      (category) => !orderedCategoryIds.includes(category.id),
    );
    return [...orderedCategories, ...missingCategories].map((category) => category.id);
  }, [categories, categoriesById, orderedCategoryIds]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = displayCategoryIds.indexOf(String(active.id));
    const newIndex = displayCategoryIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    onOrderChange(arrayMove(displayCategoryIds, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      autoScroll
    >
      <SortableContext items={displayCategoryIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col">
          {displayCategoryIds.map((categoryId, index) => {
            const category = categoriesById.get(categoryId);
            if (!category) return null;
            return (
              <SortableCategoryRow
                key={category.id}
                category={category}
                disabled={disabled}
                isLast={index === displayCategoryIds.length - 1}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
