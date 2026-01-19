import { getRecipes, getRecipesByCategories } from "@/lib/db/recipes";
import RecipeCard from "./card";

export default async function RecipeGrid({
  categorySlugs,
}: {
  categorySlugs?: string | string[];
}) {
  // Normalize categorySlugs to array
const slugs = Array.isArray(categorySlugs)
  ? categorySlugs
  : categorySlugs
  ? [categorySlugs]
  : [];

  const recipes =
    slugs.length > 0 ? await getRecipesByCategories(slugs) : await getRecipes();

  return (
    <div className="px-4 pb-4 w-full grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.name} recipe={recipe} />
      ))}
    </div>
  );
}
