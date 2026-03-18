import { Card } from "@/components/ui/card";
import { LogMealType } from "@/src/generated/enums";
import type { LogSlotData } from "@/lib/log/view-model";
import { LogRecipeCard } from "./log-recipe-card";

type LogSlotCardProps = {
  slot: LogSlotData;
};

export function LogSlotCard({ slot }: LogSlotCardProps) {
  // Snack remains intentionally empty for this step.
  if (slot.mealType === LogMealType.SNACK || slot.recipes.length === 0) {
    return (
      <Card className="p-4 border-dashed min-h-[120px] flex items-center">
        <p className="text-sm text-muted-foreground">{slot.label}: empty</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {slot.recipes.map((recipe) => (
        <LogRecipeCard
          key={recipe.id}
          title={recipe.title}
          slug={recipe.slug}
          imageUrl={recipe.imageUrl}
          calories={recipe.calories}
          proteins={recipe.proteins}
          fats={recipe.fats}
          carbs={recipe.carbs}
        />
      ))}
    </div>
  );
}
