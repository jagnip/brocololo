import { describe, expect, it } from "vitest";
import type { GroceriesEditableRow } from "@/components/groceries/groceries-edit-types";
import {
  normalizeGroceryDisplayLabel,
  resolveAddFreeTextToGroceries,
  resolveAddIngredientToGroceries,
  shouldScrollAfterIngredientAdd,
} from "@/lib/groceries/groceries-add-ingredient";

function makeRow(overrides?: Partial<GroceriesEditableRow>): GroceriesEditableRow {
  return {
    id: "row-1",
    isNew: false,
    ingredientId: "ingredient-1",
    ingredientCategoryId: "category-dairy",
    displayLabel: "Milk",
    amount: 1,
    unitId: "unit-piece",
    substitutionsAllowed: false,
    substitutionNote: null,
    additionalInfo: null,
    recipeAttribution: null,
    ...overrides,
  };
}

function makeIngredient() {
  return {
    id: "ingredient-2",
    slug: "tomato",
    name: "Tomato",
    brand: null,
    descriptor: null,
    icon: null,
    categoryId: "category-produce",
    defaultUnitId: "unit-piece",
    category: {
      id: "category-produce",
      name: "Produce",
      slug: "produce",
      sortOrder: 1,
    },
    unitConversions: [
      {
        unitId: "unit-piece",
        unit: { id: "unit-piece", name: "piece" },
      },
    ],
    groceryIngredient: {
      additionalInfo: "ripe",
      substitutionNote: "or canned",
      substitutionsAllowed: true,
    },
  } as const;
}

describe("resolveAddIngredientToGroceries", () => {
  it("returns duplicate when ingredient is already on the list", () => {
    const rows = [makeRow({ id: "existing-row", ingredientId: "ingredient-1" })];

    const result = resolveAddIngredientToGroceries({
      ingredientId: "ingredient-1",
      rows,
      ingredient: makeIngredient(),
    });

    expect(result).toEqual({
      type: "duplicate",
      existingRowId: "existing-row",
    });
  });

  it("returns not_found when ingredient id is missing from lookup", () => {
    const result = resolveAddIngredientToGroceries({
      ingredientId: "missing-ingredient",
      rows: [],
      ingredient: undefined,
    });

    expect(result).toEqual({ type: "not_found" });
  });

  it("appends a new row in the ingredient DB category with default amount/unit", () => {
    const ingredient = makeIngredient();

    const result = resolveAddIngredientToGroceries({
      ingredientId: ingredient.id,
      rows: [],
      ingredient,
      createRowId: () => "new-row-id",
    });

    expect(result).toEqual({
      type: "added",
      newRow: {
        id: "new-row-id",
        isNew: true,
        ingredientId: "ingredient-2",
        ingredientCategoryId: "category-produce",
        displayLabel: "Tomato",
        amount: null,
        unitId: null,
        substitutionsAllowed: true,
        substitutionNote: "or canned",
        additionalInfo: "ripe",
        recipeAttribution: null,
      },
    });
  });

  it("defaults library add to null amount and unit for grams-only ingredients", () => {
    const ingredient = {
      ...makeIngredient(),
      defaultUnitId: "unit-g",
      unitConversions: [
        {
          unitId: "unit-g",
          unit: { id: "unit-g", name: "g" },
        },
      ],
    };

    const result = resolveAddIngredientToGroceries({
      ingredientId: ingredient.id,
      rows: [],
      ingredient,
      createRowId: () => "grams-row",
    });

    expect(result.type).toBe("added");
    if (result.type !== "added") {
      throw new Error("Expected added result");
    }

    expect(result.newRow.amount).toBeNull();
    expect(result.newRow.unitId).toBeNull();
  });

  it("uses quick-add draft literally when amount and unitId are null", () => {
    const ingredient = {
      ...makeIngredient(),
      defaultUnitId: "unit-g",
      unitConversions: [
        {
          unitId: "unit-g",
          unit: { id: "unit-g", name: "g" },
        },
      ],
    };

    const result = resolveAddIngredientToGroceries({
      ingredientId: ingredient.id,
      rows: [],
      ingredient,
      createRowId: () => "quick-add-row",
      draft: {
        amount: null,
        unitId: null,
        additionalInfo: null,
        substitutionNote: null,
      },
    });

    expect(result.type).toBe("added");
    if (result.type !== "added") {
      throw new Error("Expected added result");
    }

    expect(result.newRow.amount).toBeNull();
    expect(result.newRow.unitId).toBeNull();
  });

  it("uses explicit draft notes when quick-add draft is provided", () => {
    const ingredient = makeIngredient();

    const result = resolveAddIngredientToGroceries({
      ingredientId: ingredient.id,
      rows: [],
      ingredient,
      createRowId: () => "draft-row",
      draft: {
        amount: 3,
        unitId: "unit-piece",
        additionalInfo: "organic",
        substitutionNote: "or cherry tomatoes",
      },
    });

    expect(result).toEqual({
      type: "added",
      newRow: {
        id: "draft-row",
        isNew: true,
        ingredientId: "ingredient-2",
        ingredientCategoryId: "category-produce",
        displayLabel: "Tomato",
        amount: 3,
        unitId: "unit-piece",
        substitutionsAllowed: true,
        substitutionNote: "or cherry tomatoes",
        additionalInfo: "organic",
        recipeAttribution: null,
      },
    });
  });
});

describe("normalizeGroceryDisplayLabel", () => {
  it("trims and lowercases for dedupe", () => {
    expect(normalizeGroceryDisplayLabel("  Flour  ")).toBe("flour");
  });
});

describe("resolveAddFreeTextToGroceries", () => {
  it("returns invalid when label or category is missing", () => {
    expect(
      resolveAddFreeTextToGroceries({
        displayLabel: "",
        ingredientCategoryId: "category-1",
        rows: [],
      }),
    ).toEqual({ type: "invalid" });

    expect(
      resolveAddFreeTextToGroceries({
        displayLabel: "Paper towels",
        ingredientCategoryId: null,
        rows: [],
      }),
    ).toEqual({ type: "invalid" });
  });

  it("returns duplicate when same label and category already exist (case-insensitive)", () => {
    const rows = [
      makeRow({
        id: "existing-row",
        ingredientId: null,
        ingredientCategoryId: "category-household",
        displayLabel: "Paper towels",
      }),
    ];

    const result = resolveAddFreeTextToGroceries({
      displayLabel: "  paper towels ",
      ingredientCategoryId: "category-household",
      rows,
    });

    expect(result).toEqual({
      type: "duplicate",
      existingRowId: "existing-row",
    });
  });

  it("allows same label in different categories", () => {
    const rows = [
      makeRow({
        id: "bakery-flour",
        ingredientId: null,
        ingredientCategoryId: "category-bakery",
        displayLabel: "Flour",
      }),
    ];

    const result = resolveAddFreeTextToGroceries({
      displayLabel: "Flour",
      ingredientCategoryId: "category-pantry",
      rows,
      createRowId: () => "pantry-flour",
    });

    expect(result.type).toBe("added");
    if (result.type !== "added") {
      throw new Error("Expected added result");
    }
    expect(result.newRow.id).toBe("pantry-flour");
    expect(result.newRow.ingredientCategoryId).toBe("category-pantry");
  });

  it("appends a free-text row with draft values", () => {
    const result = resolveAddFreeTextToGroceries({
      displayLabel: "Special spice",
      ingredientCategoryId: "category-pantry",
      rows: [],
      createRowId: () => "free-text-row",
      draft: {
        amount: 2,
        unitId: "unit-jar",
        additionalInfo: "small jar",
        substitutionNote: "any brand",
      },
    });

    expect(result).toEqual({
      type: "added",
      newRow: {
        id: "free-text-row",
        isNew: true,
        ingredientId: null,
        ingredientCategoryId: "category-pantry",
        displayLabel: "Special spice",
        amount: 2,
        unitId: "unit-jar",
        substitutionsAllowed: true,
        substitutionNote: "any brand",
        additionalInfo: "small jar",
        recipeAttribution: null,
      },
    });
  });
});

describe("shouldScrollAfterIngredientAdd", () => {
  it("always scrolls for duplicates", () => {
    expect(
      shouldScrollAfterIngredientAdd(
        { type: "duplicate", existingRowId: "row-1" },
        false,
      ),
    ).toBe(true);
  });

  it("scrolls new rows only when scrollOnNewAdd is true", () => {
    const added = resolveAddIngredientToGroceries({
      ingredientId: "ingredient-2",
      rows: [],
      ingredient: makeIngredient(),
      createRowId: () => "new-row",
    });
    if (added.type !== "added") {
      throw new Error("Expected added result");
    }

    expect(shouldScrollAfterIngredientAdd(added, true)).toBe(true);
    expect(shouldScrollAfterIngredientAdd(added, false)).toBe(false);
  });

  it("does not scroll when ingredient was not found", () => {
    expect(shouldScrollAfterIngredientAdd({ type: "not_found" }, true)).toBe(false);
  });

  it("does not scroll when free-text add is invalid", () => {
    expect(shouldScrollAfterIngredientAdd({ type: "invalid" }, true)).toBe(false);
  });

  it("scrolls free-text duplicates", () => {
    expect(
      shouldScrollAfterIngredientAdd(
        { type: "duplicate", existingRowId: "row-1" },
        false,
      ),
    ).toBe(true);
  });
});
