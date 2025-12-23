"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import RecipeFilters from "./recipe-filters";

export default function RecipeFiltersWithParams() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("category") || undefined;
  const recipeId = searchParams.get("recipe") || undefined;

  return (
    <Suspense fallback={null}>
      <RecipeFilters activeCategorySlug={categoryId} recipeId={recipeId} />
    </Suspense>
  );
}
