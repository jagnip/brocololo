import { notFound } from "next/navigation";
import { getRecipeBySlug } from "@/lib/db/recipes";
import { getIngredients } from "@/lib/db/ingredients";
import RecipePage from "./recipe-page";
import { getIngredientFormDependencies } from "@/components/ingredients/form/form-dependencies";

type RecipeDialogContainerProps = {
  recipeSlug: string;
};

export default async function RecipeDialogContainer({
  recipeSlug,
}: RecipeDialogContainerProps) {
  const [recipe, ingredients, ingredientFormDependencies] = await Promise.all([
    getRecipeBySlug(recipeSlug),
    getIngredients(),
    getIngredientFormDependencies(),
  ]);

  if (!recipe) {
    notFound();
  }

  return (
    <RecipePage
      recipe={recipe}
      ingredients={ingredients}
      ingredientFormDependencies={ingredientFormDependencies}
    />
  );
}
