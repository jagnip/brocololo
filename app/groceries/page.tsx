import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { getPlans } from "@/lib/db/planner";
import { Button } from "@/components/ui/button";

function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const startStr = start.toLocaleDateString("en-US", options);
  const endStr = end.toLocaleDateString("en-US", options);
  return `${startStr} – ${endStr}`;
}

export default async function GroceriesPage() {
  const plans = await getPlans();

  return (
    <div className="page-container space-y-8 py-8">
      <header className="space-y-1">
        <h1 className="type-h1">Groceries</h1>
        <p className="text-sm text-muted-foreground max-w-prose">
          Open a saved grocery list for one of your meal plans, or generate a
          new list from the plan page.
        </p>
      </header>

      {plans.length === 0 ? (
        <section className="rounded-xl border bg-card p-8 space-y-4 max-w-lg">
          <h2 className="text-lg font-medium">No plan available</h2>
          <p className="text-sm text-muted-foreground">
            Create a meal plan first, then generate a grocery list from it.
          </p>
          <Button asChild>
            <Link href={ROUTES.planCreate}>Create a plan</Link>
          </Button>
        </section>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {plans.map((plan) => {
            const label = formatDateRange(plan.startDate, plan.endDate);
            return (
              <li
                key={plan.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <CalendarDays
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="font-medium">{label}</span>
                </div>
                <Button asChild variant="outline" size="default">
                  <Link href={ROUTES.groceriesView(plan.id)}>Open list</Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
