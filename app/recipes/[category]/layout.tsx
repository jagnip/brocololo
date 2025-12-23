import CategorySkeleton from "@/components/skeletons/category-skeleton";
import RecipeFilters from "@/components/recipes/recipe-filters";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ category: string;}>;
  children: React.ReactNode;
};

export default async function Layout({ params, children }: PageProps) {
  const { category } = await params;
console.log(category);
  return (
    <>
      <Suspense fallback={<CategorySkeleton />}>
        <RecipeFilters activeCategory={ category } />
      </Suspense>
      {children}
    </>
  );
}
