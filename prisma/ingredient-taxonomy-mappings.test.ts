import { describe, expect, it } from "vitest";
import { INGREDIENT_CATEGORY_SEEDS } from "./ingredient-categories.seed";
import {
  resolveFrozenFreeTextCategory,
  resolveIngredientCategoryMove,
} from "./ingredient-taxonomy-mappings";

describe("ingredient taxonomy", () => {
  it("defines a unique canonical category order", () => {
    expect(INGREDIENT_CATEGORY_SEEDS).toHaveLength(26);
    expect(new Set(INGREDIENT_CATEGORY_SEEDS.map(({ name }) => name)).size).toBe(
      26,
    );
    expect(new Set(INGREDIENT_CATEGORY_SEEDS.map(({ slug }) => slug)).size).toBe(
      26,
    );
    expect(INGREDIENT_CATEGORY_SEEDS.slice(21, 25).map(({ name }) => name)).toEqual([
      "Frozen Fruit",
      "Frozen Vegetables",
      "Frozen Fish & Seafood",
      "Frozen Desserts",
    ]);
    expect(INGREDIENT_CATEGORY_SEEDS.at(-1)?.name).toBe("Other");
  });

  it.each([
    ["blueberries-frozen-foods", "Frozen Fruit"],
    ["raspberries-frozen-foods", "Frozen Fruit"],
    ["red-berries-mix-frozen-foods", "Frozen Fruit"],
    ["tropical-fruit-mix-frozen-foods", "Frozen Fruit"],
    ["brussel-sprouts-frozen-foods", "Frozen Vegetables"],
    ["edamame-frozen-foods", "Frozen Vegetables"],
    ["garlic-chopped-frozen-foods", "Frozen Vegetables"],
    ["grilled-veg-mix-frozen-foods", "Frozen Vegetables"],
    ["macedonia", "Frozen Vegetables"],
    ["onion-diced-frozen-foods", "Frozen Vegetables"],
    ["peas-frozen-foods", "Frozen Vegetables"],
    ["cod-frozen-foods", "Frozen Fish & Seafood"],
    ["hake-frozen-foods", "Frozen Fish & Seafood"],
    ["ray-fish-with-skin-bone-in-frozen", "Frozen Fish & Seafood"],
    ["salmon-frozen", "Frozen Fish & Seafood"],
    ["seafood-mix", "Frozen Fish & Seafood"],
    ["shrimps-frozen-frozen-foods", "Frozen Fish & Seafood"],
    ["frozen-yogurt-frozen-foods", "Frozen Desserts"],
    ["ice-cream-lolly-frozen-foods", "Frozen Desserts"],
    ["sorbet-lolly-frozen-foods", "Frozen Desserts"],
  ])("maps frozen ingredient %s", (ingredientSlug, expected) => {
    expect(
      resolveIngredientCategoryMove({
        sourceCategorySlug: "frozen-foods",
        ingredientSlug,
      }),
    ).toBe(expected);
  });

  it("maps cleanup rows only from the expected source category", () => {
    expect(
      resolveIngredientCategoryMove({
        sourceCategorySlug: "others",
        ingredientSlug: "tofu-quiche-beu-others",
      }),
    ).toBe("Prepared Food");
    expect(
      resolveIngredientCategoryMove({
        sourceCategorySlug: "bakery",
        ingredientSlug: "tofu-quiche-beu-others",
      }),
    ).toBeNull();
  });

  it.each([
    ["Green beans frozen", "Frozen Vegetables"],
    [" shrimp ", "Frozen Fish & Seafood"],
    ["SHRIMPS", "Frozen Fish & Seafood"],
  ])("maps frozen free-text row %s", (label, expected) => {
    expect(resolveFrozenFreeTextCategory(label)).toBe(expected);
  });

  it("rejects unknown frozen rows", () => {
    expect(
      resolveIngredientCategoryMove({
        sourceCategorySlug: "frozen-foods",
        ingredientSlug: "unknown",
      }),
    ).toBeNull();
    expect(resolveFrozenFreeTextCategory("Unknown")).toBeNull();
  });
});
