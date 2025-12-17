import type { RecipeType } from "@/types/recipe";

type RecipeCardProps = {
  recipe: RecipeType;
};

export default function RecipeCard({ recipe }: RecipeCardProps) {
  return (
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
  );
}
