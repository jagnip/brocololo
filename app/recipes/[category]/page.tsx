import GridSkeleton from "@/components/recipes/recipe-grid-skeleton";
import RecipeGrid from "@/components/recipes/recipe-grid";
import { Suspense } from "react";
import { recipesData } from "@/lib/recipes-data";
import { RecipeType } from "@/types/recipe";

type PageProps = {
  params: Promise<{ category: string }>;
};

export default async function Page({ params }: PageProps) {
  const { category: activeCategory } = await params;

  //This gonna block Suspense streaming until the categories are loaded
  //Use use() from React from Clinet Server Insight lesson
  const recipes = recipesData;

    const filteredRecipes =
      activeCategory && activeCategory !== "all"
        ? recipes.filter((r: RecipeType) =>
            r.categorySlugs.includes(activeCategory as string)
          )
        : recipes;

  return (
    <>
      <Suspense fallback={<GridSkeleton />}>
        <RecipeGrid recipes={filteredRecipes} />
      </Suspense>
    </>
  );
}
