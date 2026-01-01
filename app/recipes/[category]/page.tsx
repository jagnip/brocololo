import GridSkeleton from "@/components/recipes/grid-skeleton";
import RecipeGrid from "@/components/recipes/grid";
import { Suspense } from "react";
import RecipeHeader from "@/components/recipe-header";

type PageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ q: string }>;
  modal: React.ReactNode;
};

export default async function Page({ params, searchParams, modal }: PageProps) {
  const { category: activeCategoryRaw } = await params;
  const { q: searchQuery } = await searchParams;
  const activeCategory = activeCategoryRaw.toLowerCase();

  return (
    <>
      <RecipeHeader activeCategory={activeCategory} />
      <Suspense fallback={<GridSkeleton />}>
        <RecipeGrid activeCategory={activeCategory} searchQuery={searchQuery} />
      </Suspense>{" "}
      {modal}
    </>
  );
}
