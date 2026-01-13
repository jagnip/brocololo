import { getCategories } from "@/lib/db/categories";
import RecipeForm from "@/components/recipes/form/index";
import { getRecipeBySlug } from "@/lib/db/recipes";
import { getIngredients } from "@/lib/db/ingredients";

export default async function RecipeFormContainer({
  recipeSlug,
}: {
  recipeSlug?: string;
}) {
  const categories = await getCategories();
  const ingredients = await getIngredients();
  const recipe = recipeSlug ? await getRecipeBySlug(recipeSlug) : null;

  return (
    <div className="max-w-xl mx-auto mt-10">
      <RecipeForm categories={categories} ingredients={ingredients} recipe={recipe ?? undefined} />
    </div>
  );
}
