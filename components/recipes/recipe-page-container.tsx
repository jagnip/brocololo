import { notFound } from "next/navigation";
import { getRecipeBySlug } from "@/lib/db/recipes";
import { getIngredients } from "@/lib/db/ingredients";
import RecipePage from "./recipe-page";
import { getIngredientFormDependencies } from "@/components/ingredients/form/form-dependencies";
import { RecipePageProvider } from "@/components/context/recipe-page-context";

type RecipePageContainerProps = {
  recipeSlug: string;
};

export default async function RecipePageContainer({
  recipeSlug,
}: RecipePageContainerProps) {
  const [recipe, ingredients, ingredientFormDependencies] = await Promise.all([
    getRecipeBySlug(recipeSlug),
    getIngredients(),
    getIngredientFormDependencies(),
  ]);

  if (!recipe) {
    notFound();
  }

  return (
    <RecipePageProvider recipe={recipe} ingredients={ingredients}>
      <RecipePage ingredientFormDependencies={ingredientFormDependencies} />
    </RecipePageProvider>
  );
}
