import { notFound } from "next/navigation";
import RecipeDialog from "./dialog";
import { getRecipeBySlug } from "@/lib/db/recipes";

type RecipeDialogContainerProps = {
  recipeSlug: string;
};

export default async function RecipeDialogContainer({
  recipeSlug,
}: RecipeDialogContainerProps) {

  const recipe = await getRecipeBySlug(recipeSlug);

  if (!recipe) {
    notFound();
  }

  return <RecipeDialog recipe={recipe} />;
}
