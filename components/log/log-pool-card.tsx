import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LogSlotData } from "@/lib/log/view-model";
import { LogRecipeCard } from "./log-recipe-card";
import { PlusIcon } from "lucide-react";

type LogSlotCardProps = {
  slot: LogSlotData;
  onRecipeClick?: (recipe: LogSlotData["recipes"][number]) => void;
  onEmptyClick?: () => void;
  onRecipeRemove?: (recipe: LogSlotData["recipes"][number]) => void;
};

export function LogPoolCard({
  slot,
  onRecipeClick,
  onEmptyClick,
  onRecipeRemove,
}: LogSlotCardProps) {
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
          <span className="text-sm font-medium text-muted-foreground">
            {slot.label}
          </span>
          <span className="text-xs text-muted-foreground">
            I'm empty 😭
          </span>
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {slot.recipes.map((recipe) => (
        <div key={recipe.id} className="space-y-2">
          <LogRecipeCard
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
          {onRecipeRemove ? (
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => onRecipeRemove(recipe)}
            >
              Remove from slot
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
