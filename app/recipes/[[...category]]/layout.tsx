import CategorySkeleton from "@/components/skeletons/category-skeleton";
import RecipeFilters from "@/components/recipes/recipe-filters";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ category?: string }>;
  children: React.ReactNode;
};

export default async function Layout({ params, children }: PageProps) {
  const { category } = await params;
  const categorySlug = category?.[0] ?? 'all';

  return (
    <>
      <Suspense fallback={<CategorySkeleton />}>
        <RecipeFilters activeCategorySlug={categorySlug} />
      </Suspense>
      {children}
    </>
  );
}
