import RecipeCard from "@/components/recipes/card";
import { formatDayLabel } from "@/lib/utils";
import { DayMealsType, PlanInputType, SlotInputType } from "@/types/planner";
import { MealType } from "@/src/generated/enums";


function groupSlotsByDate(plan: PlanInputType): Map<string, SlotInputType[]> {
  const slotsByDate = new Map<string, SlotInputType[]>();
  for (const slot of plan) {
    const date = slot.date.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const slots = slotsByDate.get(date) ?? [];
    slotsByDate.set(date, [...slots, slot]);
  }
  return slotsByDate;
}


function getMealsForDate(
  slotsByDate: Map<string, SlotInputType[]>,
  dateKey: string
): DayMealsType {
  const slots = slotsByDate.get(dateKey)!;
  return {
    date: slots[0].date,
    breakfast: slots.find((s) => s.mealType === MealType.BREAKFAST)!,
    lunch: slots.find((s) => s.mealType === MealType.LUNCH)!,
    dinner: slots.find((s) => s.mealType === MealType.DINNER)!,
  };
}

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
