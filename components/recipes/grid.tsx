import { getRecipes } from "@/lib/db/recipes";
import RecipeCard from "./card";

export type RecipeGridProps = {
  categorySlugs?: string | string[];
  search?: string;
  proteinSlug?: string;
  typeSlug?: string;
  timeFilter?: string;
};

export default async function RecipeGrid({
  categorySlugs,
  search,
  proteinSlug,
  typeSlug,
  timeFilter,
}: RecipeGridProps) {
  // Normalize category slug input to array for DB helper compatibility.
  const slugs = Array.isArray(categorySlugs)
    ? categorySlugs
    : categorySlugs
      ? [categorySlugs]
      : [];

  // Keep time filter resilient to invalid URL values.
  const handsOnTimeMax =
    timeFilter === "lte20" ? 20 : timeFilter === "lte30" ? 30 : undefined;
  const recipes = await getRecipes(slugs, search, undefined, {
    proteinSlug,
    typeSlug,
    handsOnTimeMax,
  });

  return (
    <div className="group-has-[[data-pending='true']]:animate-pulse px-4 pb-4 w-full grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.name} recipe={recipe} />
      ))}
    </div>
  );
}
