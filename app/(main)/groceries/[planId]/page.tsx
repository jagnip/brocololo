import Link from "next/link";
import { notFound } from "next/navigation";
import { GroceriesViewShell } from "@/components/groceries/groceries-view-shell";
import { getPlanDateRangeById } from "@/lib/db/planner";
import { getShoppingListByPlanId } from "@/lib/db/shopping-list";
import { getIngredientCategories } from "@/lib/db/ingredients";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { requireUser } from "@/lib/auth/session";

export default async function GroceriesPlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const { id: userId } = await requireUser();

  const [dateRange, list, categories] = await Promise.all([
    getPlanDateRangeById(userId, planId),
    getShoppingListByPlanId(userId, planId),
    getIngredientCategories(),
  ]);

  if (!dateRange) {
    notFound();
  }

  return (
    <div className="page-container space-y-8 py-8">
      {list && list.items.length > 0 ? (
        <GroceriesViewShell
          list={list}
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
          }))}
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
