import type { RecipeType } from "@/types/recipe";
import { getRecipes, getRecipeById } from "@/lib/db";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import RecipeCard from "./recipe-card";
import { RecipeDialog } from "./recipe-dialog";

type RecipeGridProps = {
  categoryId?: string;
  recipeId?: string;
};

export default async function RecipeGrid({
  categoryId,
  recipeId,
}: RecipeGridProps) {
  const recipes = await getRecipes();

  const filteredRecipes = categoryId
    ? recipes.filter((r: RecipeType) => r.category === categoryId)
    : recipes;

  const selectedRecipe = recipeId
    ? await getRecipeById(recipeId, categoryId)
    : null;

  if (recipeId && !selectedRecipe) {
    notFound();
  }

  return (
    <>
      <div className="px-4 pb-4 w-full grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {filteredRecipes.map((recipe: RecipeType) => (
          <RecipeCard key={recipe.name} recipe={recipe} />
        ))}
      </div>
      {selectedRecipe && (
        <Suspense fallback={null}>
          <RecipeDialog recipe={selectedRecipe} open={true} />
        </Suspense>
      )}
    </>
  );
}
