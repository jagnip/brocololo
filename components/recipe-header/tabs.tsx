import type { CategoryType } from "@/types/category";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { categoriesData } from "@/lib/categories-data";

export default async function RecipeTabs({
  activeCategory,
}: {
  activeCategory: string;
}) {
  const categories = categoriesData;

  const categoryExists = categories.some((cat) => cat.slug === activeCategory);

  if (!categoryExists) {
    notFound();
  }

  const getFilterStyles = (categorySlug: string) => {
    const isActive = activeCategory === categorySlug;

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
    <div className="flex flex-wrap gap-2">
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
    </div>
  );
}
