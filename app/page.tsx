import RecipeFilters from "@/components/recipes/recipe-filters";
import RecipeGrid from "@/components/recipes/recipe-grid";
import { RecipeDialogWrapper } from "@/components/recipes/recipe-dialog-wrapper";
import { getRecipes, deriveCategoriesFromRecipes } from "@/lib/db";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type PageProps = {
  searchParams: Promise<{ recipe?: string; category?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const recipes = await getRecipes();
  const categories = deriveCategoriesFromRecipes(recipes);
  const { recipe: recipeId, category: categoryId } = await searchParams;

  const filteredRecipes = categoryId
    ? recipes.filter((r: { category: string }) => r.category === categoryId)
    : recipes;

  const selectedRecipe = recipeId
    ? filteredRecipes.find((r: { id: number }) => r.id.toString() === recipeId)
    : null;

  if (recipeId && !selectedRecipe) {
    notFound();
  }

  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        <RecipeFilters categories={categories} />
      </Suspense>
      <RecipeGrid recipes={filteredRecipes} />
      {selectedRecipe && (
        <Suspense fallback={<div>Loading</div>}>
          <RecipeDialogWrapper recipe={selectedRecipe} />
        </Suspense>
      )}
    </>
  );
}
