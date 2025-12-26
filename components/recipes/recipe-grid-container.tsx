import type { RecipeType } from "@/types/recipe";
import { recipesData } from "@/lib/recipes-data";
import RecipeGrid from "./recipe-grid";

type RecipeGridContainerProps = {
  activeCategorySlug: string;
};

export default async function RecipeGridContainer({
  activeCategorySlug,
}: RecipeGridContainerProps) {
  const recipes = recipesData;

  const filteredRecipes =
    activeCategorySlug && activeCategorySlug !== "all"
      ? recipes.filter((r: RecipeType) =>
          r.categorySlugs.includes(activeCategorySlug)
        )
      : recipes;

  return (
    <RecipeGrid
      recipes={filteredRecipes}
      activeCategorySlug={activeCategorySlug}
    />
  );
}
