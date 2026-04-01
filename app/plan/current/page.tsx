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
 * Sidebar “Planner” entry: jump straight to the active plan (today in range) or latest.
 */
export default async function PlanCurrentPage() {
  const plans = await getPlans();
  if (plans.length === 0) {
    // Render an actionable empty state instead of redirecting back to /plan.
    return <PlanCurrentEmpty />;
  }
  const today = new Date();
  const targetPlan =
    plans.find((plan) => isWithinDateRange(today, plan.startDate, plan.endDate)) ??
    plans[0];

  redirect(ROUTES.planView(targetPlan.id));
}
