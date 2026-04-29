import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { getPlans } from "@/lib/db/planner";
import { PlanCurrentEmpty } from "@/components/planner/plan-current-empty";

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isWithinDateRange(date: Date, start: Date, end: Date) {
  const targetKey = toDateKey(date);
  const startKey = toDateKey(start);
  const endKey = toDateKey(end);
  return targetKey >= startKey && targetKey <= endKey;
}

/**
 * Sidebar “Planner”/“Log” entry: jump straight to the active plan (today in range) or latest.
 */
export default async function PlanCurrentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; person?: string }>;
}) {
  const plans = await getPlans();
  const { tab, person } = await searchParams;
  if (plans.length === 0) {
    // Render an actionable empty state instead of redirecting back to /plan.
    return <PlanCurrentEmpty />;
  }
  const today = new Date();
  const targetPlan =
    plans.find((plan) => isWithinDateRange(today, plan.startDate, plan.endDate)) ??
    plans[0];

  // Preserve tab/person context when resolving "current plan".
  const nextTab = tab === "log" ? "log" : "plan";
  const params = new URLSearchParams();
  params.set("tab", nextTab);
  if (person) {
    params.set("person", person);
  }

  redirect(`${ROUTES.planView(targetPlan.id)}?${params.toString()}`);
}
