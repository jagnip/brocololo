import CategorySkeleton from "@/components/recipe-filters/filters-skeleton";
import RecipeFiltersContainer from "@/components/recipe-filters/recipe-filters-container";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ category: string }>;
  children: React.ReactNode;
  modal: React.ReactNode;
};

export default async function Layout({ params, children, modal }: PageProps) {
  const { category: categorySlug } = await params;

  return (
    <>
      <Suspense fallback={<CategorySkeleton />}>
        <RecipeFiltersContainer activeCategorySlug={categorySlug} />
      </Suspense>
      {children}
      {modal}
    </>
  );
}
