import RecipeCard from "@/components/recipes/card";
import {
  formatDayLabel,
  getMealsForDate,
  groupSlotsByDate,
  getProteinKey,
} from "@/lib/planner/helpers";
import { PlanInputType } from "@/types/planner";
import { RecipeType } from "@/types/recipe";
import { PROTEIN_COLORS } from "@/lib/constants";

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

type PlanViewProps = {
  plan: PlanInputType;
  fridgeIngredientIds?: string[];
};

export function PlanView({ plan, fridgeIngredientIds = [] }: PlanViewProps) {
  if (plan.length === 0) {
    return null;
  }

  const slotsByDate = groupSlotsByDate(plan);
  const sortedDates = Array.from(slotsByDate.keys()).sort();

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
                  <RecipeCard
                    recipe={breakfast.recipe}
                    fridgeMatchIngredients={getFridgeMatchIngredients(
                      breakfast.recipe,
                      fridgeIngredientIds,
                    )}
                    proteinColor={getProteinAccentColor(breakfast.recipe)}
                  />
                </div>
              )}
              {lunch && (
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Lunch</p>
                  <RecipeCard
                    recipe={lunch.recipe}
                    fridgeMatchIngredients={getFridgeMatchIngredients(
                      lunch.recipe,
                      fridgeIngredientIds,
                    )}
                    proteinColor={getProteinAccentColor(lunch.recipe)}
                  />
                </div>
              )}
              {dinner && (
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Dinner</p>
                  <RecipeCard
                    recipe={dinner.recipe}
                    fridgeMatchIngredients={getFridgeMatchIngredients(
                      dinner.recipe,
                      fridgeIngredientIds,
                    )}
                    proteinColor={getProteinAccentColor(dinner.recipe)}
                  />
                </div>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
