import { SavedListsManager } from "@/components/groceries/library/saved-lists-manager";
import { requireUser } from "@/lib/auth/session";
import { getIngredientLists } from "@/lib/db/ingredient-lists";
import { getIngredientCategories, getIngredients } from "@/lib/db/ingredients";

export default async function SavedListsPage() {
  const { id: userId } = await requireUser();
  const [lists, ingredients, categories] = await Promise.all([
    getIngredientLists(userId),
    getIngredients(userId),
    getIngredientCategories(),
  ]);

  return <SavedListsManager lists={lists} ingredients={ingredients} categories={categories} />;
}
