import CategorySkeleton from "@/components/recipe-filters/filters-skeleton";
import RecipeFilters from "@/components/recipe-filters/recipe-filters";
import { categoriesData } from "@/lib/categories-data";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ category: string }>;
  children: React.ReactNode;
  modal: React.ReactNode;
};

export default async function Layout({ params, children, modal }: PageProps) {
  const { category : activeCategory } = await params;

  //This gonna block Suspense streaming until the categories are loaded
  //Use use() from React from Clinet Server Insight lesson
  const categories = categoriesData;

  if (activeCategory !== "all") {
    const categoryExists = categoriesData.some(
      (cat) => cat.slug === activeCategory
    );

    if (!categoryExists) {
      notFound();
    }
  }

  return (
    <>
      <Suspense fallback={<CategorySkeleton />}>
        <RecipeFilters categories={categories} />
      </Suspense>
      {children}
      {modal}
    </>
  );
}
