import type { RecipeType } from "@/types/recipe";

type RecipeGridProps = {
  recipes: RecipeType[];
};

export default function RecipeGrid({ recipes }: RecipeGridProps) {
  return (
    <div className="w-full grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {recipes.map((recipe: RecipeType) => (
        <div key={recipe.id} className="flex flex-col gap-2">
          <img
            src={recipe.photo}
            alt={recipe.name}
            width={300}
            height={300}
            className="w-full h-auto rounded"
          />
          <div>
            <p>{recipe.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
