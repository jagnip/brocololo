"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { RECIPES_LIST_FILTERS_STORAGE_KEY } from "@/lib/recipes/recipes-list-filters-storage";

/**
 * While the user is on the recipes index, mirror URL filters into sessionStorage
 * so create/edit cancel can restore the same query string.
 */
export function RecipesListFiltersPersistence() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname !== "/recipes") {
      return;
    }
    const query = searchParams.toString();
    if (query.length === 0) {
      sessionStorage.removeItem(RECIPES_LIST_FILTERS_STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(RECIPES_LIST_FILTERS_STORAGE_KEY, query);
  }, [pathname, searchParams]);

  return null;
}
