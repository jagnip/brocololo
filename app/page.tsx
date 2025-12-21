import RecipeFilters from "@/components/recipes/recipe-filters";
import RecipeGrid from "@/components/recipes/recipe-grid";
import { RecipeDialog } from "@/components/recipes/recipe-dialog";
import { getRecipes, getCategories } from "@/lib/db";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type PageProps = {
  searchParams: Promise<{ recipe?: string; category?: string }>;
};

// Force dynamic rendering so force-cache works at request time, not build time
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: PageProps) {
  const [recipes, categories] = await Promise.all([
    getRecipes(),
    getCategories(),
  ]);
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
          <RecipeDialog recipe={selectedRecipe} open={true} />
        </Suspense>
      )}
    </>
  );
}
