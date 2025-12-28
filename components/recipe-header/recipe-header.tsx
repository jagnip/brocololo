"use client";

import type { CategoryType } from "@/types/category";
import RecipeSearch from "./recipe-search";
import RecipeFilters from "./recipe-filters";

export default function RecipeHeader({
  categories,
}: {
  categories: CategoryType[];
}) {

return (
  <header className="flex flex-wrap items-center gap-2 sticky top-0 z-10 bg-background py-4 px-4 w-full">
    <RecipeSearch />
    <RecipeFilters categories={categories} />
  </header>
);
}
