import { notFound } from "next/navigation";
import { GroceriesEditList } from "@/components/groceries/groceries-edit-list";
import { getIngredients } from "@/lib/db/ingredients";
import { getShoppingListByPlanId } from "@/lib/db/shopping-list";
import { getUnits } from "@/lib/db/units";

export default async function GroceriesEditPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  // Keep page-level responsibility to URL + data fetching only.
  const [list, ingredients, units] = await Promise.all([
    getShoppingListByPlanId(planId),
    getIngredients(),
    getUnits(),
  ]);

  if (!list) {
    notFound();
  }

  return (
    <div className="page-container space-y-8 py-8">
      <GroceriesEditList list={list} ingredients={ingredients} units={units} />
    </div>
  );
}
