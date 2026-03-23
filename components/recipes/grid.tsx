import type { RecipeType } from "@/types/recipe";
import RecipeCard from "./card";
import { RecipeGridEmpty } from "./grid-empty";

export type RecipeGridProps = {
  recipes: RecipeType[];
};

export default function RecipeGrid({ recipes }: RecipeGridProps) {
  return (
    <div className="group-has-[[data-pending='true']]:animate-pulse px-4 pb-4 w-full grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {recipes.length === 0 ? (
        <RecipeGridEmpty />
      ) : (
        recipes.map((recipe) => (
          <RecipeCard key={recipe.slug} recipe={recipe} />
        ))
      )}
    </div>
  );
}
