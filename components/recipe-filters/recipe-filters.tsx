import type { CategoryType } from "@/types/category";
import { categoriesData } from "@/lib/categories-data";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

type RecipeFiltersProps = {
  activeCategorySlug: string;
};

export default function RecipeFilters({
  activeCategorySlug,
}: RecipeFiltersProps) {
  const categories = categoriesData;

  if (activeCategorySlug !== "all") {
    const categoryExists = categories.some(
      (cat) => cat.slug === activeCategorySlug
    );

    if (!categoryExists) {
      notFound();
    }
  }
  const getFilterStyles = (categorySlug: string) => {
    const isActive = activeCategorySlug === categorySlug;

    return cn(
      "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      isActive
        ? "bg-foreground text-background"
        : "bg-muted text-muted-foreground hover:bg-muted/80"
    );
  };

  const buildUrl = (categorySlug: string) => {
    return `/recipes/${categorySlug}`;
  };

  return (
    <header className="flex flex-wrap gap-2 sticky top-0 z-10 bg-background py-4 px-4 w-full">
      <Link
        href={buildUrl("all")}
        className={getFilterStyles("all")}
        scroll={false}
      >
        All
      </Link>
      {categories.map((category: CategoryType) => (
        <Link
          key={category.id}
          href={buildUrl(category.slug)}
          className={getFilterStyles(category.slug)}
          scroll={false}
        >
          {category.name}
        </Link>
      ))}
    </header>
  );
}
