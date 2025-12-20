"use client";

import type { CategoryType } from "@/types/category";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type RecipeFiltersProps = {
  categories: CategoryType[];
};

export default function RecipeFilters({ categories }: RecipeFiltersProps) {
  const pathname = usePathname();

  const getLinkClassName = (href: string) => {
    const isActive =
      pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

    return cn(
      "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      isActive
        ? "bg-foreground text-background"
        : "bg-muted text-muted-foreground hover:bg-muted/80"
    );
  };

  return (
    <header className="flex flex-wrap gap-2 sticky top-0 z-10 bg-background py-4 px-4 w-full">
      <Link href="/" className={getLinkClassName("/")}>
        All
      </Link>
      {categories.map((category: CategoryType) => (
        <Link
          key={category.id}
          href={`/category/${category.id}`}
          className={getLinkClassName(`/category/${category.id}`)}
        >
          {category.name}
        </Link>
      ))}
    </header>
  );
}
