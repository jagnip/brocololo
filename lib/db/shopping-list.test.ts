import { describe, expect, it } from "vitest";
import { resolvePresetCategoryOrderIds } from "./shopping-list";

describe("resolvePresetCategoryOrderIds", () => {
  const canonicalOrder = ["cat-bakery", "cat-veg", "cat-fruit", "cat-dairy"];

  it("returns canonical sortOrder for built-in preset even when DB rows are shuffled", () => {
    const result = resolvePresetCategoryOrderIds(
      {
        isBuiltIn: true,
        categoryOrders: [
          { ingredientCategoryId: "cat-dairy", position: 0 },
          { ingredientCategoryId: "cat-fruit", position: 1 },
          { ingredientCategoryId: "cat-bakery", position: 2 },
          { ingredientCategoryId: "cat-veg", position: 3 },
        ],
      },
      canonicalOrder,
    );

    expect(result).toEqual(canonicalOrder);
  });

  it("preserves custom preset aisle order and appends missing categories", () => {
    const result = resolvePresetCategoryOrderIds(
      {
        isBuiltIn: false,
        categoryOrders: [
          { ingredientCategoryId: "cat-dairy", position: 0 },
          { ingredientCategoryId: "cat-veg", position: 1 },
        ],
      },
      canonicalOrder,
    );

    expect(result).toEqual(["cat-dairy", "cat-veg", "cat-bakery", "cat-fruit"]);
  });

  it("falls back to canonical order when no preset is active", () => {
    const result = resolvePresetCategoryOrderIds(null, canonicalOrder);
    expect(result).toEqual(canonicalOrder);
  });
});
