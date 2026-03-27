import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { getPlans } from "@/lib/db/planner";
import { Button } from "@/components/ui/button";

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isWithinDateRange(date: Date, start: Date, end: Date) {
  const targetKey = toDateKey(date);
  const startKey = toDateKey(start);
  const endKey = toDateKey(end);
  return targetKey >= startKey && targetKey <= endKey;
}

export default async function PlannerPage() {
  const plans = await getPlans();
  if (plans.length > 0) {
    const today = new Date();
    // Open the currently active plan; fallback to latest if no active range exists.
    const targetPlan = plans.find((plan) =>
      isWithinDateRange(today, plan.startDate, plan.endDate),
    ) ?? plans[0];

    redirect(ROUTES.planView(targetPlan.id));
  }

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
      <section className="rounded-lg border p-6 space-y-3">
        <h2 className="text-lg font-medium">No plans yet</h2>
        <p className="text-sm text-muted-foreground">
          Create your first weekly plan to start filling this section.
        </p>
        <Button asChild>
          <Link href={ROUTES.planCreate}>Create first plan</Link>
        </Button>
      </section>
    </div>
  );
}
