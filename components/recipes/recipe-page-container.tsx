import { notFound } from "next/navigation";
import { getRecipeBySlug } from "@/lib/db/recipes";
import { getIngredients } from "@/lib/db/ingredients";
import RecipePage from "./recipe-page";

type RecipeDialogContainerProps = {
  recipeSlug: string;
};

export default async function RecipeDialogContainer({
  recipeSlug,
}: RecipeDialogContainerProps) {
  const [recipe, ingredients] = await Promise.all([
    getRecipeBySlug(recipeSlug),
    getIngredients(),
  ]);

  if (!recipe) {
    notFound();
  }

  return <RecipePage recipe={recipe} ingredients={ingredients} />;
}
