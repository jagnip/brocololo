import type { RecipeType } from "@/types/recipe";
import RecipeCard from "./recipe-card";

type RecipeCardContainerProps = {
  recipe: RecipeType;
  categorySlug: string;
};

export default function RecipeCardContainer({
  recipe,
  categorySlug,
}: RecipeCardContainerProps) {
  const url = `/recipes/${categorySlug}/${recipe.slug}`;

  return <RecipeCard recipe={recipe} url={url} />;
}


