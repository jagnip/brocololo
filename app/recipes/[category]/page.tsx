import GridSkeleton from "@/components/recipes/grid-skeleton";
import RecipeGrid from "@/components/recipes/grid";
import { getRecipesByCategory } from "@/lib/db/recipes";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ category: string }>;
};

export default async function Page({ params }: PageProps) {
  const { category: activeCategoryRaw } = await params;
  const activeCategory = activeCategoryRaw.toLowerCase();

  return (
    <Suspense fallback={<GridSkeleton />}>
      <RecipeGridWithData activeCategory={activeCategory} />
    </Suspense>
  );
}

async function RecipeGridWithData({
  activeCategory,
}: {
  activeCategory: string;
}) {
  const recipes = await getRecipesByCategory(activeCategory);
  return <RecipeGrid recipes={recipes} />;
}
