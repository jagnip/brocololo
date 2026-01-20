import GridSkeleton from "@/components/recipes/grid-skeleton";
import RecipeGrid from "@/components/recipes/grid";
import { Suspense } from "react";
import { RecipeTabsContainer } from "@/components/recipes/tabs-container";


export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const params = await searchParams;

  return (
    <>
      <RecipeTabsContainer />
      <Suspense fallback={<GridSkeleton />}>
        <RecipeGrid categorySlugs={params.category} />
      </Suspense>
    </>
  );
}
