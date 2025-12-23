import GridSkeleton from "@/components/skeletons/grid-skeleton";
import RecipeGrid from "@/components/recipes/recipe-grid";
import { Suspense } from "react";
import { categoriesData } from "@/lib/categories-data";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ category?: string }>;
};

export default async function Page({ params }: PageProps) {
  const { category } = await params;
  const categorySlug = category?.[0] ?? "all";

  return (
    <>
      <Suspense fallback={<GridSkeleton />}>
        <RecipeGrid activeCategorySlug={categorySlug} />
      </Suspense>
    </>
  );
}
