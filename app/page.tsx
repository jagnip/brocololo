import RecipeFilters from "@/components/recipes/recipe-filters";
import RecipeGrid from "@/components/recipes/recipe-grid";
import { Suspense } from "react";

type PageProps = {
  searchParams: Promise<{ recipe?: string; category?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { recipe: recipeId, category: categoryId } = await searchParams;

  return (
    <>
      <Suspense fallback={null}>
        <RecipeFilters activeCategory={categoryId} recipeId={recipeId} />
      </Suspense>
      <Suspense fallback={null}>
        <RecipeGrid categoryId={categoryId} recipeId={recipeId} />
      </Suspense>
    </>
  );
}
