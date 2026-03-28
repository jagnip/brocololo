import Link from "next/link";
import { CalendarPlus, UtensilsCrossed } from "lucide-react";
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
  return `${startStr} - ${endStr}`;
}

/** All plans index (breadcrumb “Planner” from a plan opens here). Sidebar uses /plan/current. */
export default async function PlannerPage() {
  const plans = await getPlans();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Planner</h1>
        <Button asChild>
          <Link href={ROUTES.planCreate}>
            <CalendarPlus className="h-4 w-4" />
            New plan
          </Link>
        </Button>
      </header>

      {plans.length === 0 ? (
        <section className="rounded-lg border p-6 space-y-3">
          <h2 className="text-lg font-medium">No plans yet</h2>
          <p className="text-sm text-muted-foreground">
            Create your first weekly plan to start filling this section.
          </p>
          <Button asChild>
            <Link href={ROUTES.planCreate}>Create first plan</Link>
          </Button>
        </section>
      ) : (
        <ul className="rounded-lg border divide-y">
          {plans.map((plan) => {
            const label = formatDateRange(plan.startDate, plan.endDate);
            return (
              <li key={plan.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{label}</span>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={ROUTES.planView(plan.id)}>Open</Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
