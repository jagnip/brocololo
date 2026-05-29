import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlanDateRangeById, getPlansCached } from "@/lib/db/planner";
import { getShoppingListByPlanId } from "@/lib/db/shopping-list";
import { GroceriesPersistedList } from "@/components/groceries/groceries-persisted-list";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { formatDateRangeLabel } from "@/lib/format-date-range-label";

export default async function GroceriesPlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  const [dateRange, list, plans] = await Promise.all([
    getPlanDateRangeById(planId),
    getShoppingListByPlanId(planId),
    getPlansCached(),
  ]);

  if (!dateRange) {
    notFound();
  }

  const planOptions = plans.map((plan) => ({
    id: plan.id,
    label: formatDateRangeLabel(plan.startDate, plan.endDate),
  }));

  return (
    <div className="page-container space-y-8 py-8">
      {list && list.items.length > 0 ? (
        <GroceriesPersistedList
          list={list}
          planOptions={planOptions}
          currentPlanId={planId}
        />
      ) : (
        <section className="mx-auto max-w-lg space-y-4 rounded-xl border bg-card p-8 text-center">
          <h1 className="type-h1 text-balance">No grocery list yet</h1>
          <p className="text-sm text-muted-foreground">
            Generate a list from your meal plan. You can open the plan and use
            &quot;Generate grocery list&quot; on the Manage tab.
          </p>
          <Button asChild>
            <Link href={ROUTES.planView(planId)}>Go to plan</Link>
          </Button>
        </section>
      )}
    </div>
  );
}
