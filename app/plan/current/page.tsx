import { redirect } from "next/navigation";
import { PlanCurrentEmpty } from "@/components/planner/plan-current-empty";
import { ROUTES } from "@/lib/constants";
import { getPlans } from "@/lib/db/planner";
import { resolveCurrentPlanFromList } from "@/lib/planner/resolve-current-plan";

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
    return <PlanCurrentEmpty emptyBreadcrumbContext="meal-plan" />;
  }
  const targetPlan = resolveCurrentPlanFromList(plans);
  if (!targetPlan) {
    return <PlanCurrentEmpty emptyBreadcrumbContext="meal-plan" />;
  }

  // Preserve tab/person context when resolving "current plan".
  const nextTab = tab === "log" ? "log" : "plan";
  const params = new URLSearchParams();
  params.set("tab", nextTab);
  if (person) {
    params.set("person", person);
  }

  redirect(`${ROUTES.planView(targetPlan.id)}?${params.toString()}`);
}
