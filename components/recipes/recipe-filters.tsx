import type { CategoryType } from "@/types/category";
import { categoriesData } from "@/lib/categories-data";
import Link from "next/link";
import { cn } from "@/lib/utils";

type RecipeFiltersProps = {
  activeCategory?: string;
  recipeId?: string;
};

export default function RecipeFilters({
  activeCategory,
  recipeId,
}: RecipeFiltersProps) {
  const categories = categoriesData;

  const getLinkClassName = (categoryName: string | null) => {
    const isActive = (activeCategory ?? null) === categoryName;

    return cn(
      "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      isActive
        ? "bg-foreground text-background"
        : "bg-muted text-muted-foreground hover:bg-muted/80"
    );
  };

  const buildUrl = (categoryName: string | null) => {
    if (!categoryName) {
      return recipeId ? `/?recipe=${recipeId}` : "/";
    }

    return recipeId
      ? `/?category=${encodeURIComponent(categoryName)}&recipe=${recipeId}`
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
