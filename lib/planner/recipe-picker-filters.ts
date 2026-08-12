import { MEAL_OCCASION_BREADCRUMB_LABELS } from "@/lib/constants";
import type { PlannerMealType } from "@/src/generated/enums";
import type { RecipeType } from "@/types/recipe";

/** Map a planner slot meal type to the matching MEAL_OCCASION category slug. */
export const PLANNER_MEAL_TYPE_TO_OCCASION_SLUG: Record<PlannerMealType, string> =
  {
    BREAKFAST: "breakfast",
    LUNCH: "lunch",
    DINNER: "dinner",
  };

export type RecipePickerOccasionOption = {
  slug: string;
  name: string;
};

/**
 * Distinct meal-occasion categories present on the loaded recipes, ordered by
 * the canonical key order of MEAL_OCCASION_BREADCRUMB_LABELS.
 */
export function getOccasionOptions(
  recipes: RecipeType[],
): RecipePickerOccasionOption[] {
  const bySlug = new Map<string, string>();

  for (const recipe of recipes) {
    for (const category of recipe.categories) {
      if (category.type !== "MEAL_OCCASION") continue;
      if (!bySlug.has(category.slug)) {
        bySlug.set(category.slug, category.name);
      }
    }
  }

  const canonicalOrder = Object.keys(MEAL_OCCASION_BREADCRUMB_LABELS);
  return [...bySlug.entries()]
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => {
      const indexA = canonicalOrder.indexOf(a.slug);
      const indexB = canonicalOrder.indexOf(b.slug);
      const orderA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
      const orderB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
}

export type FilterRecipesParams = {
  search?: string;
  occasionSlug?: string | null;
  handsOnTimeMax?: number | null;
};

/**
 * Client-side filter mirroring getRecipes server semantics so the picker
 * matches the recipes page: case-insensitive name search, MEAL_OCCASION slug
 * match, inclusive hands-on time ceiling, then handsOnTime ascending.
 */
export function filterRecipes(
  recipes: RecipeType[],
  params: FilterRecipesParams,
): RecipeType[] {
  const trimmedSearch = params.search?.trim().toLowerCase() ?? "";
  const occasionSlug = params.occasionSlug || null;
  const handsOnTimeMax =
    params.handsOnTimeMax != null && Number.isFinite(params.handsOnTimeMax)
      ? params.handsOnTimeMax
      : null;

  const filtered = recipes.filter((recipe) => {
    if (trimmedSearch && !recipe.name.toLowerCase().includes(trimmedSearch)) {
      return false;
    }

    if (occasionSlug) {
      const matchesOccasion = recipe.categories.some(
        (category) =>
          category.type === "MEAL_OCCASION" && category.slug === occasionSlug,
      );
      if (!matchesOccasion) return false;
    }

    if (handsOnTimeMax != null && recipe.handsOnTime > handsOnTimeMax) {
      return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => a.handsOnTime - b.handsOnTime);
}
