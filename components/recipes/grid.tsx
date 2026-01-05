import { getRecipesByCategory } from "@/lib/db/recipes";
import RecipeCard from "./card";

type RecipeGridProps = {
  activeCategory: string;
  searchQuery?: string;
};

export default async function RecipeGrid({
  activeCategory,
  searchQuery,
}: RecipeGridProps) {
  let recipes = await getRecipesByCategory(activeCategory);

  if (recipes.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-muted-foreground">
        No recipes found 🥲
      </p>
    );
  }

  return (
    <div className="px-4 pb-4 w-full grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.name} recipe={recipe} />
      ))}
    </div>
  );
}
