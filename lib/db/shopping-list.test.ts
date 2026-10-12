import { describe, expect, it } from "vitest";
import { resolvePresetCategoryOrderIds, slotsToPlanSlotData } from "./shopping-list";

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

describe("slotsToPlanSlotData batch storage", () => {
  it("expands each storage meal once and adds one anonymous extras source", () => {
    const recipe = { name: "Bolognese", servings: 2, ingredients: [] };
    const result = slotsToPlanSlotData({
      familyMembers: [{ id: "j", isSelf: true }, { id: "n", isSelf: false }],
      slots: [
        {
          recipeId: "recipe-1",
          batchGroupId: "batch-1",
          cookingFamilyMemberIds: ["j"],
          recipe,
          customName: null,
          customIngredients: [],
        },
      ],
      batches: [
        {
          id: "batch-1",
          recipeId: "recipe-1",
          storageRows: [
            { count: 2, cookingFamilyMemberIds: ["j", "n"] },
          ],
          extraPortions: 3,
        },
      ],
      startDate: "2026-10-19T00:00:00.000Z",
      endDate: "2026-10-25T00:00:00.000Z",
    } as never);

    expect(result).toHaveLength(4);
    expect(
      result.filter(
        (slot) => slot.cookingFamilyMemberIds?.join(",") === "j,n",
      ),
    ).toHaveLength(2);
    expect(result.filter((slot) => slot.extraPortions === 3)).toHaveLength(1);
  });
});
