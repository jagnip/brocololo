import { redirect } from "next/navigation";
import { PlanCurrentEmpty } from "@/components/planner/plan-current-empty";
import { ROUTES } from "@/lib/constants";
import { getPlans } from "@/lib/db/planner";
import { resolveCurrentPlanFromList } from "@/lib/planner/resolve-current-plan";
import { requireUser } from "@/lib/auth/session";

/**
 * Sidebar “Groceries”: jump to grocery list for the active plan (today in range) or latest.
 */
export default async function GroceriesCurrentPage() {
  const { id: userId } = await requireUser();
  const plans = await getPlans(userId);
  if (plans.length === 0) {
    return <PlanCurrentEmpty emptyBreadcrumbContext="groceries" />;
  }
  const targetPlan = resolveCurrentPlanFromList(plans);
  if (!targetPlan) {
    return <PlanCurrentEmpty emptyBreadcrumbContext="groceries" />;
  }
  redirect(ROUTES.groceriesView(targetPlan.id));
}
