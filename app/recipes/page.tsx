import GridSkeleton from "@/components/recipes/grid-skeleton";
import RecipeGrid from "@/components/recipes/grid";
import { Suspense } from "react";

type PageProps = {
  searchParams: Promise<{ q: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { q: searchQuery } = await searchParams;

  return (
    <>
      <Suspense fallback={<GridSkeleton />}>
        <RecipeGrid activeCategory={"all"} searchQuery={searchQuery} />
      </Suspense>
    </>
  );
}
