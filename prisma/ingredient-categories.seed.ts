/**
 * Default supermarket-aisle taxonomy and order for `IngredientCategory` rows.
 * Existing slugs remain stable because ingredient filters use them in URLs.
 */
export const INGREDIENT_CATEGORY_SEEDS = [
  { name: "Bakery", slug: "bakery" },
  { name: "Prepared Food", slug: "prepared-food" },
  { name: "Fresh Vegetables", slug: "veg" },
  { name: "Fresh Fruit", slug: "fruit" },
  { name: "Coffee & Tea", slug: "coffee-and-tea" },
  { name: "Pasta, Rice & Grains", slug: "pasta-rice-and-beans" },
  { name: "Nuts, Snacks & Sweets", slug: "snacks-and-sweets" },
  {
    name: "Herbs, Spices & Seasonings",
    slug: "spices-herbs-and-seasonings",
  },
  { name: "Tinned Food & Soups", slug: "tinned-foods-and-soups" },
  { name: "Oils & Vinegars", slug: "oils-and-dressings" },
  { name: "Household & Cleaning", slug: "kitchen-and-cleaning" },
  { name: "Personal Care & Health", slug: "personal-care-and-health" },
  { name: "Sauces & Condiments", slug: "sauce-and-condiments" },
  { name: "Drinks", slug: "beverages" },
  { name: "Cereals & Breakfast", slug: "cereal-and-breakfast-foods" },
  { name: "Baking Ingredients", slug: "baking-items" },
  { name: "Milk & Eggs", slug: "milk-and-eggs" },
  {
    name: "Yogurt & Chilled Desserts",
    slug: "yogurt-and-chilled-desserts",
  },
  { name: "Cheese, Butter & Cream", slug: "cheese-butter-and-cream" },
  { name: "Meat & Poultry", slug: "meat-and-poultry" },
  { name: "Fish & Seafood", slug: "fish-and-seafood" },
  { name: "Frozen Fruit", slug: "frozen-fruit" },
  { name: "Frozen Vegetables", slug: "frozen-vegetables" },
  { name: "Frozen Fish & Seafood", slug: "frozen-fish-and-seafood" },
  { name: "Frozen Desserts", slug: "frozen-desserts" },
  { name: "Other", slug: "others" },
] as const;

export type IngredientCategorySeedName =
  (typeof INGREDIENT_CATEGORY_SEEDS)[number]["name"];

export const INGREDIENT_CATEGORY_ORDER = INGREDIENT_CATEGORY_SEEDS.map(
  ({ name }) => name,
);
