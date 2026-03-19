import { Card } from "@/components/ui/card";
import type { LogSlotData } from "@/lib/log/view-model";
import { LogRecipeCard } from "./log-recipe-card";

type LogSlotCardProps = {
  slot: LogSlotData;
  onRecipeClick?: (recipe: LogSlotData["recipes"][number]) => void;
  onEmptyClick?: () => void;
};

export function LogSlotCard({ slot, onRecipeClick, onEmptyClick }: LogSlotCardProps) {
  if (slot.recipes.length === 0) {
    return (
      <Card className="min-h-[120px] border-dashed bg-muted/20">
        <button
          type="button"
          className="w-full h-full p-4 flex flex-col items-center justify-center gap-2 text-center"
          onClick={onEmptyClick}
          disabled={!onEmptyClick}
          aria-label={`Add ${slot.label.toLowerCase()} entry`}
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm">
            +
          </span>
          <span className="text-sm font-medium">Add {slot.label.toLowerCase()} entry</span>
          <span className="text-xs text-muted-foreground">
            Click to choose recipe or add ingredients
          </span>
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {slot.recipes.map((recipe) => (
        <LogRecipeCard
          key={recipe.id}
          cardKind={recipe.cardKind}
          title={recipe.title}
          slug={recipe.slug}
          imageUrl={recipe.imageUrl}
          calories={recipe.calories}
          proteins={recipe.proteins}
          fats={recipe.fats}
          carbs={recipe.carbs}
          onClick={onRecipeClick ? () => onRecipeClick(recipe) : undefined}
        />
      ))}
    </div>
  );
}
