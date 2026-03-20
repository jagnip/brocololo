import RecipeGrid, { type RecipeGridProps } from "@/components/recipes/grid";
import { Suspense } from "react";
import { RecipeTabsContainer } from "@/components/recipes/tabs-container";
import { RecipesPageSkeleton } from "@/components/recipes/recipes-page-skeleton";


export default async function Page({
  searchParams, 
}: {
  searchParams: Promise<{
    category?: string | string[];
    q?: string | string[];
    protein?: string | string[];
    type?: string | string[];
    time?: string | string[];
  }>;
}) {
  const params = await searchParams;
  // Normalize possibly repeated URL params into single values for filtering.
  const category = Array.isArray(params.category) ? params.category[0] : params.category;
  const search = Array.isArray(params.q) ? params.q[0] : params.q;
  const protein = Array.isArray(params.protein) ? params.protein[0] : params.protein;
  const type = Array.isArray(params.type) ? params.type[0] : params.type;
  const time = Array.isArray(params.time) ? params.time[0] : params.time;

  const gridProps: RecipeGridProps = {
    categorySlugs: category,
    search,
    proteinSlug: protein,
    typeSlug: type,
    timeFilter: time,
  };

  return (
    <>
      <Suspense fallback={<RecipesPageSkeleton />}>
        <RecipeTabsContainer />
        <RecipeGrid {...gridProps} />
      </Suspense>
    </>
  );
}
