import { getCategories } from "@/lib/db/categories";
import RecipeForm from "@/components/recipes/form/recipe-form";
import { getRecipeBySlug } from "@/lib/db/recipes";
import { getIngredients } from "@/lib/db/ingredients";
import { getIngredientFormDependencies } from "@/components/ingredients/form/form-dependencies";

export default async function RecipeFormContainer({
  recipeSlug,
}: {
  recipeSlug?: string;
}) {
  const [categories, ingredients, ingredientFormDependencies, recipe] =
    await Promise.all([
      getCategories(),
      getIngredients(),
      getIngredientFormDependencies(),
      recipeSlug ? getRecipeBySlug(recipeSlug) : null,
    ]);

  return (
    <RecipeForm
      categories={categories}
      ingredients={ingredients}
      ingredientFormDependencies={ingredientFormDependencies}
      recipe={recipe ?? undefined}
    />
  );
}
