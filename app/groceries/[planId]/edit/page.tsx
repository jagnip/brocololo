import { notFound } from "next/navigation";
import { GroceriesEditLibraryPlaceholder } from "@/components/groceries/groceries-edit-library-placeholder";
import { GroceriesEditList } from "@/components/groceries/groceries-edit-list";
import { getIngredientCategories, getIngredients } from "@/lib/db/ingredients";
import { getShoppingListByPlanId } from "@/lib/db/shopping-list";
import { getUnits } from "@/lib/db/units";

export default async function GroceriesEditPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  // Keep page-level responsibility to URL + data fetching only.
  // categories is fetched separately so the edit form can render a section
  // for every category, even ones that currently have no items.
  const [list, ingredients, categories, units] = await Promise.all([
    getShoppingListByPlanId(planId),
    getIngredients(),
    getIngredientCategories(),
    getUnits(),
  ]);

  if (!list) {
    notFound();
  }

  return (
    <div className="page-container py-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <GroceriesEditList
          list={list}
          ingredients={ingredients}
          categories={categories}
          units={units}
        />
        <GroceriesEditLibraryPlaceholder className="hidden lg:block" />
      </div>
    </div>
  );
}
