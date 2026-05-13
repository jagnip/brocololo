import { ROUTES } from "@/lib/constants";

/** sessionStorage key for last `/recipes` search string (e.g. `q=...&occasion=...`). */
export const RECIPES_LIST_FILTERS_STORAGE_KEY = "brocololo.recipesList.query";

/** Build `/recipes` URL including stored filters (used after create/edit cancel). */
export function getRecipesListHrefWithStoredFilters(): string {
  if (typeof window === "undefined") {
    return ROUTES.recipes;
  }
  const query = sessionStorage.getItem(RECIPES_LIST_FILTERS_STORAGE_KEY);
  if (!query || query.length === 0) {
    return ROUTES.recipes;
  }
  return `${ROUTES.recipes}?${query}`;
}
