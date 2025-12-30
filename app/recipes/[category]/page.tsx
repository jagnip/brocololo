import GridSkeleton from "@/components/recipes/grid-skeleton";
import RecipeGrid from "@/components/recipes/grid";
import { Suspense } from "react";
import { recipesData } from "@/lib/recipes-data";
import { RecipeType } from "@/types/recipe";

type PageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ q: string }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { category: activeCategoryRaw } = await params;
  const { q: searchQuery } = await searchParams;
  const activeCategory = activeCategoryRaw.toLowerCase();

  return (
    <>
      <Suspense fallback={<GridSkeleton />}>
        <RecipeGrid activeCategory={activeCategory} searchQuery={searchQuery} />
      </Suspense>
    </>
  );
}
