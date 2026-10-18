import type { IngredientCategorySeedName } from "./ingredient-categories.seed";

export const OBSOLETE_FROZEN_CATEGORY_SLUGS = [
  "frozen-foods",
  "frozen",
] as const;

type IngredientMoveRule = {
  sourceCategorySlugs: readonly string[];
  ingredientSlug: string;
  targetName: IngredientCategorySeedName;
};

const frozenSourceSlugs = OBSOLETE_FROZEN_CATEGORY_SLUGS;

export const INGREDIENT_MOVE_RULES: readonly IngredientMoveRule[] = [
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "blueberries-frozen-foods", targetName: "Frozen Fruit" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "raspberries-frozen-foods", targetName: "Frozen Fruit" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "red-berries-mix-frozen-foods", targetName: "Frozen Fruit" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "tropical-fruit-mix-frozen-foods", targetName: "Frozen Fruit" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "brussel-sprouts-frozen-foods", targetName: "Frozen Vegetables" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "edamame-frozen-foods", targetName: "Frozen Vegetables" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "garlic-chopped-frozen-foods", targetName: "Frozen Vegetables" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "grilled-veg-mix-frozen-foods", targetName: "Frozen Vegetables" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "macedonia", targetName: "Frozen Vegetables" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "onion-diced-frozen-foods", targetName: "Frozen Vegetables" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "peas-frozen-foods", targetName: "Frozen Vegetables" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "cod-frozen-foods", targetName: "Frozen Fish & Seafood" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "hake-frozen-foods", targetName: "Frozen Fish & Seafood" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "ray-fish-with-skin-bone-in-frozen", targetName: "Frozen Fish & Seafood" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "salmon-frozen", targetName: "Frozen Fish & Seafood" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "seafood-mix", targetName: "Frozen Fish & Seafood" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "shrimps-frozen-frozen-foods", targetName: "Frozen Fish & Seafood" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "frozen-yogurt-frozen-foods", targetName: "Frozen Desserts" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "ice-cream-lolly-frozen-foods", targetName: "Frozen Desserts" },
  { sourceCategorySlugs: frozenSourceSlugs, ingredientSlug: "sorbet-lolly-frozen-foods", targetName: "Frozen Desserts" },
  { sourceCategorySlugs: ["veg"], ingredientSlug: "black-olives-veg", targetName: "Tinned Food & Soups" },
  { sourceCategorySlugs: ["veg"], ingredientSlug: "kiwi", targetName: "Fresh Fruit" },
  { sourceCategorySlugs: ["veg"], ingredientSlug: "lemon", targetName: "Fresh Fruit" },
  { sourceCategorySlugs: ["veg"], ingredientSlug: "pear", targetName: "Fresh Fruit" },
  { sourceCategorySlugs: ["veg"], ingredientSlug: "pickled-cucumber", targetName: "Tinned Food & Soups" },
  { sourceCategorySlugs: ["coffee-and-tea"], ingredientSlug: "bolero-coffee-and-tea", targetName: "Drinks" },
  { sourceCategorySlugs: ["snacks-and-sweets"], ingredientSlug: "erythritol", targetName: "Baking Ingredients" },
  { sourceCategorySlugs: ["snacks-and-sweets"], ingredientSlug: "sweetener-tablets-snacks-and-sweets", targetName: "Baking Ingredients" },
  { sourceCategorySlugs: ["tinned-foods-and-soups"], ingredientSlug: "cranberry-sauce", targetName: "Sauces & Condiments" },
  { sourceCategorySlugs: ["oils-and-dressings"], ingredientSlug: "sriracha-oils-and-dressings", targetName: "Sauces & Condiments" },
  { sourceCategorySlugs: ["sauce-and-condiments"], ingredientSlug: "sesame-oil", targetName: "Oils & Vinegars" },
  { sourceCategorySlugs: ["yogurt-and-chilled-desserts"], ingredientSlug: "cottage-cheese-full-fat-yogurt-and-chilled-desserts", targetName: "Cheese, Butter & Cream" },
  { sourceCategorySlugs: ["yogurt-and-chilled-desserts"], ingredientSlug: "quark-yogurt-and-chilled-desserts", targetName: "Cheese, Butter & Cream" },
  { sourceCategorySlugs: ["others"], ingredientSlug: "hummus-others", targetName: "Sauces & Condiments" },
  { sourceCategorySlugs: ["others"], ingredientSlug: "mints", targetName: "Nuts, Snacks & Sweets" },
  { sourceCategorySlugs: ["others"], ingredientSlug: "protein-powder-others", targetName: "Cereals & Breakfast" },
  { sourceCategorySlugs: ["others"], ingredientSlug: "side-carbs", targetName: "Pasta, Rice & Grains" },
  { sourceCategorySlugs: ["others"], ingredientSlug: "water-others", targetName: "Drinks" },
  { sourceCategorySlugs: ["others"], ingredientSlug: "tofu-quiche-beu-others", targetName: "Prepared Food" },
] as const;

export function resolveIngredientCategoryMove(input: {
  sourceCategorySlug: string;
  ingredientSlug: string;
}): IngredientCategorySeedName | null {
  return (
    INGREDIENT_MOVE_RULES.find(
      (rule) =>
        rule.ingredientSlug === input.ingredientSlug &&
        rule.sourceCategorySlugs.includes(input.sourceCategorySlug),
    )?.targetName ?? null
  );
}

const FREE_TEXT_FROZEN_TARGETS: Record<
  string,
  IngredientCategorySeedName
> = {
  "green beans frozen": "Frozen Vegetables",
  shrimp: "Frozen Fish & Seafood",
  shrimps: "Frozen Fish & Seafood",
};

export function resolveFrozenFreeTextCategory(
  displayLabel: string,
): IngredientCategorySeedName | null {
  const normalized = displayLabel.trim().replace(/\s+/g, " ").toLowerCase();
  return FREE_TEXT_FROZEN_TARGETS[normalized] ?? null;
}
