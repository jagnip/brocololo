import type { RecipeType } from "@/types/recipe";
import RecipeCard from "./card";
import { RecipeGridEmpty } from "./grid-empty";

export type RecipeGridProps = {
  recipes: RecipeType[];
  archived: boolean;
  hasFilters: boolean;
};

export default function RecipeGrid({ recipes, archived, hasFilters }: RecipeGridProps) {
  return (
    <div className="group-has-[[data-pending='true']]:animate-pulse px-gutter pb-gutter w-full grid grid-cols-1 gap-block sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {recipes.length === 0 ? (
        <RecipeGridEmpty archived={archived} hasFilters={hasFilters} />
      ) : (
        recipes.map((recipe) => (
          <RecipeCard key={recipe.slug} recipe={recipe} />
        ))
      )}
    </div>
  );
}
