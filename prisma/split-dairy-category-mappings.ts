/**
 * Maps ingredients out of the retired "Dairy, Eggs & Cheese" aisle into three
 * supermarket stops. Used by `migrate-split-dairy-categories.ts` and kept in sync
 * with `ingredient-seed-objects.ts`.
 */
export const NEW_DAIRY_CATEGORIES = [
  "Milk & Eggs",
  "Yogurt & Chilled Desserts",
  "Cheese, Butter & Cream",
] as const;

export type NewDairyCategoryName = (typeof NEW_DAIRY_CATEGORIES)[number];

/** Retired aisle names / slugs this migration moves ingredients away from. */
export const OLD_DAIRY_CATEGORY_NAMES = [
  "Dairy, Eggs & Cheese",
  "Dairy & Eggs",
] as const;

export const OLD_DAIRY_CATEGORY_SLUGS = [
  "dairy-eggs-and-cheese",
  "dairy-and-eggs",
  "dairy-eggs",
] as const;

/**
 * Explicit slug → new aisle. Built from dev DB scan (2026-06-30); extend when
 * prod has extra rows the heuristics might miss.
 */
export const INGREDIENT_SLUG_TO_NEW_DAIRY_CATEGORY: Record<
  string,
  NewDairyCategoryName
> = {
  // Milk & Eggs
  "milk-semi-skimmed": "Milk & Eggs",
  "whole-milk": "Milk & Eggs",
  "egg-l": "Milk & Eggs",
  "egg-white": "Milk & Eggs",
  "egg-yolk": "Milk & Eggs",
  eggs: "Milk & Eggs",

  // Yogurt & Chilled Desserts
  "greek-yogurt-light": "Yogurt & Chilled Desserts",
  "greek-yogurt-light-dairy-eggs-and-cheese": "Yogurt & Chilled Desserts",
  "jelly-light-dairy-eggs-and-cheese": "Yogurt & Chilled Desserts",
  "skyr-yogurt-dairy-eggs-and-cheese": "Yogurt & Chilled Desserts",

  // Cheese, Butter & Cream
  butter: "Cheese, Butter & Cream",
  cheddar: "Cheese, Butter & Cream",
  "cheddar-dairy-eggs-and-cheese": "Cheese, Butter & Cream",
  "cottage-cheese-light": "Cheese, Butter & Cream",
  "cottage-cheese-light-dairy-and-eggs": "Cheese, Butter & Cream",
  "creme-fraiche": "Cheese, Butter & Cream",
  "double-cream": "Cheese, Butter & Cream",
  "double-cream-dairy-eggs-and-cheese": "Cheese, Butter & Cream",
  "mozzarella-light": "Cheese, Butter & Cream",
  "mozzarella-light-ball-dairy-eggs-and-cheese": "Cheese, Butter & Cream",
  "mozzarella-light-shredded": "Cheese, Butter & Cream",
  "mozzarella-cheese": "Cheese, Butter & Cream",
  parmesan: "Cheese, Butter & Cream",
  "philadelphia-light": "Cheese, Butter & Cream",
  "ricotta-light": "Cheese, Butter & Cream",
};

const PLANT_MILK_RE =
  /plant milk|almond milk|soya|oat milk|vegetal|bebida vegetal/i;

/** Name/slug keyword fallbacks for custom ingredients still on the old aisle. */
export function inferNewDairyCategory(input: {
  slug: string;
  name: string;
}): NewDairyCategoryName | null {
  const explicit = INGREDIENT_SLUG_TO_NEW_DAIRY_CATEGORY[input.slug];
  if (explicit) return explicit;

  const hay = `${input.name} ${input.slug}`.toLowerCase();

  if (PLANT_MILK_RE.test(hay)) return null;

  if (
    /\begg\b|egg-|eggs\b|\bmilk\b|\bleite\b/.test(hay) &&
    !/cheese|cream cheese|philadelphia/.test(hay)
  ) {
    return "Milk & Eggs";
  }

  if (
    /yogurt|yoghurt|skyr|jelly|gelatin|gelatina|tiramisu|mousse|pudding|dessert|iogurte|sobremesa/.test(
      hay,
    )
  ) {
    return "Yogurt & Chilled Desserts";
  }

  if (
    /cheese|butter|cream|ricotta|philadelphia|mozzarella|cheddar|parmesan|cottage|natas|manteiga|queijo|feta|brie|gouda|emmental|fromage/.test(
      hay,
    )
  ) {
    return "Cheese, Butter & Cream";
  }

  return null;
}

export function resolveNewDairyCategory(input: {
  slug: string;
  name: string;
}): NewDairyCategoryName {
  const resolved = inferNewDairyCategory(input);
  if (!resolved) {
    throw new Error(
      `Cannot map ingredient to a new dairy aisle: slug="${input.slug}" name="${input.name}"`,
    );
  }
  return resolved;
}
