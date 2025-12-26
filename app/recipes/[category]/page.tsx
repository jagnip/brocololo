import GridSkeleton from "@/components/recipes/grid-skeleton";
import RecipeGrid from "@/components/recipes/recipe-grid";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ category: string }>;
};

export default async function Page({ params }: PageProps) {
  const { category: categorySlug } = await params;

  return (
    <>
      <Suspense fallback={<GridSkeleton />}>
        <RecipeGrid activeCategorySlug={categorySlug} />
      </Suspense>
    </>
  );
}
