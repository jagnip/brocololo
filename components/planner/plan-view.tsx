import RecipeCard from "@/components/recipes/card";
import { formatDayLabel } from "@/lib/utils";
import { Plan } from "@/types/planner";

export function PlanView({ plan }: { plan: Plan }) {
  if (plan.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 space-y-8">
      <h2 className="text-lg font-semibold">Your plan</h2>
      {plan.map((day) => (
        <article key={day.date.toISOString()} className="space-y-4">
          <h3 className="text-base font-medium">{formatDayLabel(day.date)}</h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Breakfast</p>
              <RecipeCard recipe={day.breakfast} />
            </div>
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Lunch</p>
              <RecipeCard recipe={day.lunch} />
            </div>
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Dinner</p>
              <RecipeCard recipe={day.dinner} />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
