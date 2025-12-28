import CategorySkeleton from "@/components/recipe-filters/filters-skeleton";
import RecipeFilters from "@/components/recipe-filters/recipe-filters";
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
        <RecipeFilters activeCategorySlug={categorySlug} />
      </Suspense>
      {children}
      {modal}
    </>
  );
}
