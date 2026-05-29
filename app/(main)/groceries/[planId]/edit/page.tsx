import { notFound } from "next/navigation";
import { GroceriesEditList } from "@/components/groceries/groceries-edit-list";
import { getIngredientLists } from "@/lib/db/ingredient-lists";
import { getIngredientCategories, getIngredients } from "@/lib/db/ingredients";
import { getShoppingListByPlanId } from "@/lib/db/shopping-list";
import { getUnits } from "@/lib/db/units";
import { requireUser } from "@/lib/auth/session";

export default async function GroceriesEditPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const { id: userId } = await requireUser();

  const [list, ingredients, categories, units, ingredientLists] = await Promise.all([
    getShoppingListByPlanId(userId, planId),
    getIngredients(userId),
    getIngredientCategories(),
    getUnits(),
    getIngredientLists(userId),
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
