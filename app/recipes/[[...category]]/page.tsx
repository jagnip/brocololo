import GridSkeleton from "@/components/skeletons/grid-skeleton";
import RecipeGrid from "@/components/recipes/recipe-grid";
import { Suspense } from "react";

type PageProps = {
  searchParams: Promise<{ recipe?: string; category?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { recipe: recipeId, category: categoryId } = await searchParams;

  return (
    <>
      <Suspense fallback={<GridSkeleton />}>
        <RecipeGrid categoryId={categoryId} recipeId={recipeId} />
      </Suspense>
    </>
  );
}
