"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import RecipeFilters from "./recipe-filters";

export default function RecipeFiltersWrapper() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || undefined;
  const recipeId = searchParams.get("recipe") || undefined;

  return (
    <Suspense fallback={null}>
      <RecipeFilters activeCategorySlug={category} recipeId={recipeId} />
    </Suspense>
  );
}
