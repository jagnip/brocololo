"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { SearchInput } from "@/components/search";
import { SearchableSelect } from "@/components/ui/searchable-select";

// Minimal shape; expanding the DB type elsewhere should not affect this UI.
type IngredientCategoryOption = {
  id: string;
  name: string;
  slug: string;
};

type IngredientsFilterBarProps = {
  categories: IngredientCategoryOption[];
  // Currently active category slug from the URL (?category=<slug>).
  selectedSlug?: string;
};

const INGREDIENTS_ROUTE = "/ingredients";

export function IngredientsFilterBar({
  categories,
  selectedSlug,
}: IngredientsFilterBarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // URL is the source of truth, optimistic mirrors it for instant UI feedback.
  const selectedCategory = searchParams.get("category") ?? selectedSlug ?? null;
  const [isPending, startTransition] = useTransition();
  const [optimisticCategory, setOptimisticCategory] =
    useOptimistic<string | null>(selectedCategory);

  // Mirror RecipeTabs.applyParams: a single navigation entry point keeps URL state consistent.
  const applyParams = (params: URLSearchParams) => {
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  };

  const setCategory = (nextValue: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!nextValue) {
      params.delete("category");
    } else {
      params.set("category", nextValue);
    }

    // Always clear pagination on filter change so URL stays clean and the list resets cleanly.
    params.delete("page");
    applyParams(params);
  };

  return (
    <div
      // `data-pending` powers the list pulse via group-has selector in the parent `group` wrapper.
      data-pending={isPending}
      // Layout requirement: 2 columns (50/50) on tablet and below, 4 columns on large screens.
      className="grid w-full grid-cols-2 gap-2 pt-1 pb-4 lg:grid-cols-4"
    >
      <SearchableSelect
        options={categories.map((category) => ({
          value: category.slug,
          label: category.name,
        }))}
        value={optimisticCategory}
        onValueChange={(next) => {
          // Order mirrors RecipeTabs: navigate first, then optimistic update.
          setCategory(next);
          setOptimisticCategory(next);
        }}
        placeholder="Category"
        searchPlaceholder="Search categories..."
        emptyLabel="No category found."
        allowClear
        clearLabel="Clear category filter"
        // Selector stays left; one column on desktop's 4-col layout.
        className="w-full lg:col-span-1"
      />

      <SearchInput
        placeholder="Search ingredients"
        pathOverride={INGREDIENTS_ROUTE}
        queryParam="q"
        resetParamsOnChange={["page"]}
        // On large screens search takes one column in the 4-col layout.
        className="w-full lg:col-span-1"
      />
    </div>
  );
}
