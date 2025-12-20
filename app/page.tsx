import RecipeFilters from "@/components/recipes/recipe-filters";
import RecipeGrid from "@/components/recipes/recipe-grid";
import { RecipeDialogWrapper } from "@/components/recipes/recipe-dialog-wrapper";
import { getCategories, getRecipes } from "@/lib/db";
import { notFound } from "next/navigation";
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

  if (recipeId && !selectedRecipe) {
    notFound();
  }

  return (
    <>
      <RecipeFilters categories={categories} />
      <RecipeGrid recipes={recipes} />
      {selectedRecipe && (
        <Suspense fallback={null}>
          <RecipeDialogWrapper recipe={selectedRecipe} />
        </Suspense>
      )}
    </>
  );
}
