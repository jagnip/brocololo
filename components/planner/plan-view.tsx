import RecipeCard from "@/components/recipes/card";
import { formatDayLabel, getMealsForDate, groupSlotsByDate } from "@/lib/utils";
import { PlanInputType } from "@/types/planner";


export function PlanView({ plan }: { plan: PlanInputType }) {
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
          dateKey
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
                  <RecipeCard recipe={breakfast.recipe} />
                </div>
              )}
              {lunch && (
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Lunch</p>
                  <RecipeCard recipe={lunch.recipe} />
                </div>
              )}
              {dinner && (
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Dinner</p>
                  <RecipeCard recipe={dinner.recipe} />
                </div>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
