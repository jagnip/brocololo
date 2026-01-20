"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { CategoryType } from "@/types/category";
import { Button } from "../ui/button";

export function RecipeTabs({ categories }: { categories: CategoryType[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedCategory = searchParams.get("category") ?? "";

  const toggleCategory = (categorySlug: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (selectedCategory === categorySlug) {
      params.delete("category"); 
    } else {
      params.set("category", categorySlug); 
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const getFilterStyles = (categorySlug: string) => {
    const isActive = selectedCategory === categorySlug;

    return cn(
      "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      isActive
        ? "bg-foreground text-background"
        : "bg-muted text-muted-foreground hover:bg-muted/80"
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category: CategoryType) => (
        <Button
          key={category.id}
          onClick={() => toggleCategory(category.slug)}
          className={getFilterStyles(category.slug)}
        >
          {category.name}
        </Button>
      ))}
    </div>
  );
}
