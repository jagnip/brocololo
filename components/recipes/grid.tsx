"use client";

import type { RecipeType } from "@/types/recipe";
import RecipeCard from "./card";

type RecipeGridProps = {
  recipes: RecipeType[];
};

export default function RecipeGrid({ recipes }: RecipeGridProps) {
  if (recipes.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-muted-foreground">
        No recipes found 🥲
      </p>
    );
  }

  return (
    <div className="px-4 pb-4 w-full grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.name} recipe={recipe} />
      ))}
    </div>
  );
}
