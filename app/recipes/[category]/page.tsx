import GridSkeleton from "@/components/recipes/recipe-grid-skeleton";
import RecipeGrid from "@/components/recipes/recipe-grid";
import { Suspense } from "react";
import { recipesData } from "@/lib/recipes-data";
import { RecipeType } from "@/types/recipe";

type PageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ q: string }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { category: activeCategory } = await params;
  const { q: searchQuery } = await searchParams;

  //This gonna block Suspense streaming until the categories are loaded
  //Use use() from React from Clinet Server Insight lesson
  const recipes = recipesData;

  // Filter by category
  let filteredRecipes =
    activeCategory && activeCategory !== "all"
      ? recipes.filter((r: RecipeType) =>
          r.categorySlugs.includes(activeCategory as string)
        )
      : recipes;

  // Filter by search query
  if (searchQuery) {
    const searchLower = searchQuery.toLowerCase();
    filteredRecipes = filteredRecipes.filter((r: RecipeType) => {
      return r.name.toLowerCase().includes(searchLower);
    });
  }

  return (
    <>
      <Suspense fallback={<GridSkeleton />}>
        <RecipeGrid recipes={filteredRecipes} />
      </Suspense>
    </>
  );
}
