import { describe, expect, it } from "vitest";
import type { GroceriesEditableRow } from "@/components/groceries/groceries-edit-types";
import {
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
        amount: 1,
        unitId: "unit-piece",
        substitutionsAllowed: true,
        substitutionNote: "or canned",
        additionalInfo: "ripe",
        recipeAttribution: null,
      },
    });
  });

  it("keeps grams/volume defaults empty when unit is not countable", () => {
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
    expect(result.newRow.unitId).toBe("unit-g");
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
});
