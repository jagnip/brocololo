import CategorySkeleton from "@/components/skeletons/category-skeleton";
import RecipeFilters from "@/components/recipes/recipe-filters";
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
