import CategorySkeleton from "@/components/recipes/category-skeleton";
import GridSkeleton from "@/components/recipes/grid-skeleton";
import RecipeFilters from "@/components/recipes/recipe-filters";
import RecipeGrid from "@/components/recipes/recipe-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

type PageProps = {
  searchParams: Promise<{ recipe?: string; category?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { recipe: recipeId, category: categoryId } = await searchParams;

  return (
    <>
      <Suspense fallback={<CategorySkeleton />}>
        <RecipeFilters activeCategory={categoryId} recipeId={recipeId} />
      </Suspense>
      <Suspense fallback={<GridSkeleton />}>
        <RecipeGrid categoryId={categoryId} recipeId={recipeId} />
      </Suspense>
    </>
  );
}
