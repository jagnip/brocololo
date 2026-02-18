"use client";

import {
  formatDayLabel,
  getMealsForDate,
  groupSlotsByDate,
  getProteinKey,
} from "@/lib/planner/helpers";
import { PlanInputType, SlotInputType } from "@/types/planner";
import { RecipeType } from "@/types/recipe";
import { PROTEIN_COLORS } from "@/lib/constants";
import { PlannerSlotCard } from "./planner-slot-card";

function getFridgeMatchIngredients(
  recipe: RecipeType,
  fridgeIngredientIds: string[],
): string[] {
  if (fridgeIngredientIds.length === 0) return [];
  return recipe.ingredients
    .filter((ri) => fridgeIngredientIds.includes(ri.ingredientId))
    .map((ri) => ri.ingredient.name);
}

function getProteinAccentColor(recipe: RecipeType): string | undefined {
  const key = getProteinKey(recipe);
  if (!key) return undefined;
  return PROTEIN_COLORS[key];
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
};

export function PlanView({ plan, fridgeIngredientIds = [], recipes, onShuffle, onReplace }: PlanViewProps) {
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
        fridgeMatchIngredients={getFridgeMatchIngredients(
          slot.recipe,
          fridgeIngredientIds,
        )}
        proteinColor={getProteinAccentColor(slot.recipe)}
        onShuffle={onShuffle ? () => onShuffle(slotKey) : undefined}
        onReplace={onReplace ? (recipe) => onReplace(slotKey, recipe) : undefined}
        recipes={recipes}
      />
    );
  }

  return (
    <section className="mt-8 space-y-8">
      <h2 className="text-lg font-semibold">Your plan</h2>
      {sortedDates.map((dateKey) => {
        const { date, breakfast, lunch, dinner } = getMealsForDate(
          slotsByDate,
          dateKey,
        );

        return (
          <article key={dateKey} className="space-y-4">
            <h3 className="text-base font-medium">{formatDayLabel(date)}</h3>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {breakfast && (
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Breakfast
                  </p>
                  {renderSlot(breakfast)}
                </div>
              )}
              {lunch && (
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Lunch</p>
                  {renderSlot(lunch)}
                </div>
              )}
              {dinner && (
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Dinner</p>
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
