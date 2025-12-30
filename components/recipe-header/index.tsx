"use client";

import type { CategoryType } from "@/types/category";
import { Suspense } from "react";
import RecipeSearch from "./search/index";
import RecipeFilters from "./filters";
import SearchSkeleton from "./search/search-skeleton";
import { FiltersSkeleton } from "./filters-skeleton";

export default function RecipeHeader({
  categories,
}: {
  categories: CategoryType[];
}) {
  return (
    <header className="flex flex-wrap items-center gap-2 sticky top-0 z-10 bg-background py-4 px-4 w-full">
      <Suspense fallback={<SearchSkeleton />}>
        <RecipeSearch />
      </Suspense>
      <Suspense fallback={<FiltersSkeleton />}>
        <RecipeFilters categories={categories} />
      </Suspense>
    </header>
  );
}
