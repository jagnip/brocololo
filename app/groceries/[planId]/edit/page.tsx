import { notFound } from "next/navigation";
import { GroceriesEditList } from "@/components/groceries/groceries-edit-list";
import { getIngredientLists } from "@/lib/db/ingredient-lists";
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
  // ingredientLists is fetched here too so the right-side library panel is
  // hydrated on first render and re-fetches whenever a server action calls
  // revalidatePath(ROUTES.groceriesEdit(planId)).
  const [list, ingredients, categories, units, ingredientLists] = await Promise.all([
    getShoppingListByPlanId(planId),
    getIngredients(),
    getIngredientCategories(),
    getUnits(),
    getIngredientLists(),
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
        ingredientLists={ingredientLists}
      />
    </div>
  );
}
