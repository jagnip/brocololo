/**
 * Default supermarket-aisle order for `IngredientCategory` rows.
 * Keep in sync with `categoryName` on each entry in `ingredient-seed-objects.ts`.
 * Seeded by `seed-ingredients.ts` and `reset-db-to-ingredients.ts`.
 * Categories with no matching ingredients in seed data (e.g. "Others") still get a row for manual / future assignment.
 */
export const INGREDIENT_CATEGORY_ORDER = [
  "Bakery",
  "Veg",
  "Fruit",
  "Coffee & Tea",
  "Pasta, Rice & Beans",
  "Snacks & Sweets",
  "Spices, Herbs & Seasonings",
  "Tinned Foods & Soups",
  "Oils & Dressings",
  "Kitchen & Cleaning",
  "Personal Care & Health",
  "Sauce & Condiments",
  "Beverages",
  "Cereal & Breakfast Foods",
  "Baking Items",
  "Dairy, Eggs & Cheese",
  "Meat & Poultry",
  "Fish & Seafood",
  "Frozen Foods",
  // Catch-all aisle (no rows in `ingredient-seed-objects.ts` by default).
  "Others",
] as const;

export type IngredientCategorySeedName =
  (typeof INGREDIENT_CATEGORY_ORDER)[number];
