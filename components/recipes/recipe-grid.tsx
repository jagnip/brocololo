import type { RecipeType } from "@/types/recipe";
import { recipesData } from "@/lib/recipes-data";
import RecipeCard from "./recipe-card";

type RecipeGridProps = {
  activeCategorySlug?: string;
};

export default async function RecipeGrid({
  activeCategorySlug,
}: RecipeGridProps) {
  const recipes = recipesData;

  const filteredRecipes =
    activeCategorySlug && activeCategorySlug !== "all"
      ? recipes.filter((r: RecipeType) =>
          r.categorySlugs.includes(activeCategorySlug)
        )
      : recipes;

  return (
    <>
      <div className="px-4 pb-4 w-full grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {filteredRecipes.map((recipe: RecipeType) => (
          <RecipeCard key={recipe.name} recipe={recipe} />
        ))}
      </div>
      {/* {selectedRecipe && (
        <Suspense fallback={null}>
          <RecipeDialog recipe={selectedRecipe} open={true} />
        </Suspense>
      )} */}
    </>
  );
}
