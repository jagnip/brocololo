import GridSkeleton from "@/components/recipes/grid-skeleton";
import RecipeGrid from "@/components/recipes/grid";
import { Suspense } from "react";
import RecipeHeader from "@/components/recipe-header";

type PageProps = {
  searchParams: Promise<{ q: string }>;
  modal: React.ReactNode;
};

export default async function Page({ searchParams, modal }: PageProps) {
  const { q: searchQuery } = await searchParams;

  return (
    <>
      <RecipeHeader activeCategory={"all"} />
      <Suspense fallback={<GridSkeleton />}>
        <RecipeGrid activeCategory={"all"} searchQuery={searchQuery} />
      </Suspense>{" "}
      {modal}
    </>
  );
}
