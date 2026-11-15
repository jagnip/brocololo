import { redirect } from "next/navigation";
import { PlanCurrentEmpty } from "@/components/planner/plan-current-empty";
import { ROUTES } from "@/lib/constants";
import { getPlans } from "@/lib/db/planner";
import { prisma } from "@/lib/db/index";
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
  const newestList = await prisma.shoppingList.findFirst({
    where: { plan: { userId } },
    orderBy: { createdAt: "desc" },
    select: { planId: true },
  });
  redirect(ROUTES.groceriesView(newestList?.planId ?? plans[0].id));
}
