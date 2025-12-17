import type { RecipeType } from "@/types/recipe";
import RecipeCard from "./recipe-card";

type RecipeGridProps = {
  recipes: RecipeType[];
};

export default function RecipeGrid({ recipes }: RecipeGridProps) {
  return (
    <div className="w-full grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {recipes.map((recipe: RecipeType) => (
        <RecipeCard recipe={recipe} />
      ))}
    </div>
  );
}
