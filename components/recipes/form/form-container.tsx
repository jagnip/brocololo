import { getCategories } from "@/lib/db/categories";
import RecipeForm from "@/components/recipes/form/recipe-form";
import { getRecipeBySlug } from "@/lib/db/recipes";
import { getIngredients } from "@/lib/db/ingredients";
import { getIngredientFormDependencies } from "@/components/ingredients/form/form-dependencies";
import { requireUser } from "@/lib/auth/session";
import { ensureSelfFamilyMember } from "@/lib/db/family-members";

export default async function RecipeFormContainer({
  recipeSlug,
}: {
  recipeSlug?: string;
}) {
  const { id: userId, isAdmin } = await requireUser();
  const [categories, ingredients, ingredientFormDependencies, recipe, familyMembers] =
    await Promise.all([
      getCategories(),
      getIngredients(userId),
      getIngredientFormDependencies(),
      recipeSlug ? getRecipeBySlug(userId, recipeSlug) : null,
      ensureSelfFamilyMember(userId),
    ]);

  return (
    <RecipeForm
      categories={categories}
      ingredients={ingredients}
      ingredientFormDependencies={ingredientFormDependencies}
      recipe={recipe ?? undefined}
      familyMembers={familyMembers}
      isAdmin={isAdmin}
    />
  );
}
