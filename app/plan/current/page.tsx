import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { getPlans } from "@/lib/db/planner";

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
 * For the full list of plans, use /plan (breadcrumb “Planner” target).
 */
export default async function PlanCurrentPage() {
  const plans = await getPlans();
  if (plans.length === 0) {
    redirect(ROUTES.plan);
  }
  const today = new Date();
  const targetPlan =
    plans.find((plan) => isWithinDateRange(today, plan.startDate, plan.endDate)) ??
    plans[0];

  redirect(ROUTES.planView(targetPlan.id));
}
