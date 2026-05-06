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
    // Match recipes list page feel: full-width content with gutter spacing, no max-width cap.
    <div className="w-full px-gutter pb-gutter">
      <GroceriesEditList
        list={list}
        ingredients={ingredients}
        categories={categories}
        units={units}
        sidebar={<GroceriesEditLibraryPlaceholder />}
      />
    </div>
  );
}
