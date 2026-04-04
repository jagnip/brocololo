import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { LogEditorSlotForHighlight } from "@/lib/log/is-log-recipe-card-selected";
import { isLogRecipeCardSelected } from "@/lib/log/is-log-recipe-card-selected";
import type { LogSlotData } from "@/lib/log/view-model";
import { cn } from "@/lib/utils";
import { LogRecipeCard } from "./log-recipe-card";

type LogSlotCardProps = {
  dayKey: string;
  editorSlot: LogEditorSlotForHighlight | null;
  slot: LogSlotData;
  onRecipeClick?: (recipe: LogSlotData["recipes"][number]) => void;
  onEmptyClick?: () => void;
  onRecipeRemove?: (recipe: LogSlotData["recipes"][number]) => void;
};

export function LogSlots({
  dayKey,
  editorSlot,
  slot,
  onRecipeClick,
  onEmptyClick,
  onRecipeRemove,
}: LogSlotCardProps) {
  if (slot.recipes.length === 0) {
    const isEmptyEditorActive =
      editorSlot != null &&
      editorSlot.dayKey === dayKey &&
      editorSlot.mealType === slot.mealType;

    return (
      <Card
        className={cn(
          // Fills grid row height so empty columns match taller sibling slots (see LogSlot h-full chain).
          "flex h-full min-h-0 flex-col gap-0 overflow-hidden rounded-lg border border-dashed p-0 py-0 shadow-none transition-colors",
          isEmptyEditorActive
            ? "border-foreground bg-muted/60"
            : "border-border/60 bg-card",
        )}
      >
        <button
          type="button"
          className={cn(
            "flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-3 text-center",
            onEmptyClick && !isEmptyEditorActive && "hover:bg-muted/40",
          )}
          onClick={onEmptyClick}
          disabled={!onEmptyClick}
          aria-label={`Add ${slot.label.toLowerCase()} entry`}
        >
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
            aria-hidden
          >
            <Plus className="size-3" />
          </span>
          <p className="text-sm font-medium leading-snug text-foreground">
            {slot.label}
          </p>
          <span className="text-xs text-muted-foreground">Drag to add</span>
        </button>
      </Card>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-col gap-2">
      {slot.recipes.map((recipe) => (
        <LogRecipeCard
          key={recipe.id}
          cardKind={recipe.cardKind}
          mealSlotLabel={slot.label}
          title={recipe.title}
          slug={recipe.slug}
          imageUrl={recipe.imageUrl}
          calories={recipe.calories}
          proteins={recipe.proteins}
          fats={recipe.fats}
          carbs={recipe.carbs}
          isSelected={isLogRecipeCardSelected(editorSlot, dayKey, slot, recipe)}
          onClick={onRecipeClick ? () => onRecipeClick(recipe) : undefined}
          onRemove={onRecipeRemove ? () => onRecipeRemove(recipe) : undefined}
        />
      ))}
    </div>
  );
}
