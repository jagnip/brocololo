import CategoriesHeader from "@/components/categories/categories-header";
import RecipeGrid from "@/components/recipes/recipe-grid";
import { RecipeDialogWrapper } from "@/components/recipes/recipe-dialog-wrapper";
import { getCategories, getRecipes } from "@/lib/db";
import { Suspense } from "react";

type PageProps = {
  searchParams: Promise<{ recipe?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const categories = await getCategories();
  const recipes = await getRecipes();
  const { recipe: recipeId } = await searchParams;

  const selectedRecipe = recipeId
    ? recipes.find((r: { id: number }) => r.id.toString() === recipeId)
    : null;

  return (
    <>
      <CategoriesHeader categories={categories} />
      <RecipeGrid recipes={recipes} />
      {selectedRecipe && (
        <Suspense fallback={null}>
          <RecipeDialogWrapper recipe={selectedRecipe} />
        </Suspense>
      )}
    </>
  );
}
