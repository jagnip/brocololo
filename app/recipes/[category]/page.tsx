import GridSkeleton from "@/components/recipes/recipe-grid-skeleton";
import RecipeGridContainer from "@/components/recipes/recipe-grid-container";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ category: string }>;
};

export default async function Page({ params }: PageProps) {
  const { category: categorySlug } = await params;

  return (
    <>
      <Suspense fallback={<GridSkeleton />}>
        <RecipeGridContainer activeCategorySlug={categorySlug} />
      </Suspense>
    </>
  );
}
