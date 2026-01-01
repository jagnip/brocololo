import { recipesData } from "@/lib/recipes-data";
import { notFound } from "next/navigation";
import RecipeDialog from "./dialog";

type RecipeDialogContainerProps = {
  recipeSlug: string;
};

export default function RecipeDialogContainer({
  recipeSlug,
}: RecipeDialogContainerProps) {
  const recipe = recipesData.find((r) => r.slug === recipeSlug);

  if (!recipe) {
    notFound();
  }

  return <RecipeDialog recipe={recipe} />;
}
