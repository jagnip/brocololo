import { getCategories } from "@/lib/db/categories";
import RecipeForm from "@/components/recipes/form/index";
import { RecipeType } from "@/types/recipe";
import { getRecipeBySlug } from "@/lib/db/recipes";

export default async function RecipeFormContainer({
  recipeSlug,
}: {
  recipeSlug?: string;
}) {
  const categories = await getCategories();

  const recipe = recipeSlug ? await getRecipeBySlug(recipeSlug) : null;

  return (
    <div className="max-w-xl mx-auto mt-10">
      <RecipeForm categories={categories} recipe={recipe ?? undefined} />
    </div>
  );
}
