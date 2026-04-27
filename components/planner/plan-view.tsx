"use client";

import {
  formatDayLabel,
  getMealsForDate,
  groupSlotsByDate,
} from "@/lib/planner/helpers";
import { PlanInputType, SlotInputType } from "@/types/planner";
import { RecipeType } from "@/types/recipe";
import { PlannerSlotCard } from "./planner-slot-card";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import { getIngredientDisplayName } from "@/lib/ingredients/format";

function getFridgeMatchIngredients(
  recipe: RecipeType,
  fridgeIngredientIds: string[],
): string[] {
  if (fridgeIngredientIds.length === 0) return [];
  return recipe.ingredients
    .filter((ri) => fridgeIngredientIds.includes(ri.ingredientId))
    .map((ri) =>
      getIngredientDisplayName(
        ri.ingredient.name,
        ri.ingredient.brand,
        ri.ingredient.descriptor,
      ),
    );
}

function getSlotKey(slot: SlotInputType): string {
  return `${slot.date.toISOString()}-${slot.mealType}`;
}

type PlanViewProps = {
  plan: PlanInputType;
  fridgeIngredientIds?: string[];
  recipes?: RecipeType[];
  onShuffle?: (slotKey: string) => void;
  onReplace?: (slotKey: string, recipe: RecipeType) => void;
  onRemove?: (slotKey: string) => void;
  onToggleUsed?: (slotKey: string) => void;
};

export function PlanView({ plan, fridgeIngredientIds = [], recipes, onShuffle, onReplace, onRemove, onToggleUsed }: PlanViewProps) {
  if (plan.length === 0) {
    return null;
  }

  const slotsByDate = groupSlotsByDate(plan);
  const sortedDates = Array.from(slotsByDate.keys()).sort();

  function renderSlot(slot: SlotInputType) {
    const slotKey = getSlotKey(slot);
    return (
      <PlannerSlotCard
        slot={slot}
        fridgeMatchIngredients={
          slot.recipe ? getFridgeMatchIngredients(slot.recipe, fridgeIngredientIds) : []
        }
        onShuffle={onShuffle ? () => onShuffle(slotKey) : undefined}
        onReplace={onReplace ? (recipe) => onReplace(slotKey, recipe) : undefined}
        onRemove={onRemove ? () => onRemove(slotKey) : undefined}
        onToggleUsed={onToggleUsed ? () => onToggleUsed(slotKey) : undefined}
        recipes={recipes}
      />
    );
  }

  return (
    <section className="space-y-8">
      {sortedDates.map((dateKey) => {
        const { date, breakfast, lunch, dinner } = getMealsForDate(
          slotsByDate,
          dateKey,
        );

        return (
          <article key={dateKey} className="space-y-4">
            <Subheader>{formatDayLabel(date)}</Subheader>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {breakfast && (
                <div>
                  {renderSlot(breakfast)}
                </div>
              )}
              {lunch && (
                <div>
                  {renderSlot(lunch)}
                </div>
              )}
              {dinner && (
                <div>
                  {renderSlot(dinner)}
                </div>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
