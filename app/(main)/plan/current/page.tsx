import { redirect } from "next/navigation";
import { PlanCurrentEmpty } from "@/components/planner/plan-current-empty";
import { ROUTES } from "@/lib/constants";
import { getPlans } from "@/lib/db/planner";
import {
  resolveCurrentPlanFromList,
  resolveTrackDayKey,
} from "@/lib/planner/resolve-current-plan";
import { requireUser } from "@/lib/auth/session";

/**
 * Sidebar “Planner”/“Log” entry: jump straight to the active plan (today in range) or latest.
 */
export default async function PlanCurrentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; person?: string; memberId?: string; day?: string }>;
}) {
  const { id: userId } = await requireUser();
  const plans = await getPlans(userId);
  const { tab, person, memberId, day } = await searchParams;
  if (plans.length === 0) {
    // Render an actionable empty state instead of redirecting back to /plan.
    return <PlanCurrentEmpty emptyBreadcrumbContext={tab === "log" ? "log" : "meal-plan"} />;
  }
  const targetPlan = resolveCurrentPlanFromList(plans);
  if (!targetPlan) {
    return <PlanCurrentEmpty emptyBreadcrumbContext={tab === "log" ? "log" : "meal-plan"} />;
  }

  // Preserve tab/person context when resolving "current plan".
  const nextTab = tab === "log" ? "log" : "plan";
  const params = new URLSearchParams();
  if (memberId) params.set("memberId", memberId);
  if (person) {
    params.set("person", person);
  }
  // Track defaults to today (or nearest day on the fallback plan).
  if (nextTab === "log") {
    params.set("day", day ?? resolveTrackDayKey(targetPlan));
  }

  const path = nextTab === "log"
    ? ROUTES.logPlanView(targetPlan.id)
    : ROUTES.planView(targetPlan.id);
  redirect(`${path}${params.size ? `?${params}` : ""}`);
}
