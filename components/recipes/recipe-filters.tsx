"use client";

import type { CategoryType } from "@/types/category";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type RecipeFiltersProps = {
  categories: CategoryType[];
};

export default function RecipeFilters({ categories }: RecipeFiltersProps) {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  const getLinkClassName = (categoryName: string | null) => {
    const isActive = activeCategory === categoryName;

    return cn(
      "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      isActive
        ? "bg-foreground text-background"
        : "bg-muted text-muted-foreground hover:bg-muted/80"
    );
  };

  const buildUrl = (categoryName: string | null) => {
    if (!categoryName) return "/";

    // Preserve recipe param if it exists
    const recipeParam = searchParams.get("recipe");
    return recipeParam
      ? `/?category=${encodeURIComponent(categoryName)}&recipe=${recipeParam}`
      : `/?category=${encodeURIComponent(categoryName)}`;
  };

  return (
    <header className="flex flex-wrap gap-2 sticky top-0 z-10 bg-background py-4 px-4 w-full">
      <Link
        href={buildUrl(null)}
        className={getLinkClassName(null)}
        scroll={false}
      >
        All
      </Link>
      {categories.map((category: CategoryType) => (
        <Link
          key={category.id}
          href={buildUrl(category.name)}
          className={getLinkClassName(category.name)}
          scroll={false}
        >
          {category.name}
        </Link>
      ))}
    </header>
  );
}
