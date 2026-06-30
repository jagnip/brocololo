import { describe, expect, it } from "vitest";
import {
  canManageGroceriesRowIngredient,
  getGroceriesRowIngredientActionState,
} from "@/lib/groceries/groceries-row-ingredient-action";
import { reconcileGroceryRowUnitsAfterIngredientUpdate } from "@/lib/groceries/reconcile-grocery-row-units-after-ingredient-update";
import type { GroceriesEditableRow } from "@/components/groceries/groceries-edit-types";
import type { IngredientType } from "@/types/ingredient";

describe("getGroceriesRowIngredientActionState", () => {
  it("returns none for empty rows", () => {
    expect(
      getGroceriesRowIngredientActionState({ ingredientId: null, displayLabel: "" }),
    ).toBe("none");
    expect(
      getGroceriesRowIngredientActionState({ ingredientId: null, displayLabel: "   " }),
    ).toBe("none");
  });

  it("returns create for free-text rows", () => {
    expect(
      getGroceriesRowIngredientActionState({
        ingredientId: null,
        displayLabel: "Organic bananas",
      }),
    ).toBe("create");
  });

  it("returns edit for linked DB rows", () => {
    expect(
      getGroceriesRowIngredientActionState({
        ingredientId: "ing-1",
        displayLabel: "Banana",
      }),
    ).toBe("edit");
  });
});

describe("canManageGroceriesRowIngredient", () => {
  it("is false only for empty rows", () => {
    expect(
      canManageGroceriesRowIngredient({ ingredientId: null, displayLabel: "" }),
    ).toBe(false);
    expect(
      canManageGroceriesRowIngredient({
        ingredientId: null,
        displayLabel: "Ad hoc",
      }),
    ).toBe(true);
    expect(
      canManageGroceriesRowIngredient({
        ingredientId: "ing-1",
        displayLabel: "Banana",
      }),
    ).toBe(true);
  });
});

describe("reconcileGroceryRowUnitsAfterIngredientUpdate", () => {
  const baseRow: GroceriesEditableRow = {
    id: "row-1",
    isNew: false,
    ingredientId: "ing-1",
    ingredientCategoryId: "cat-1",
    displayLabel: "Tomato",
    amount: 2,
    unitId: "unit-old",
    substitutionsAllowed: false,
    substitutionNote: null,
    additionalInfo: null,
    recipeAttribution: null,
  };

  const previousIngredient = {
    id: "ing-1",
    defaultUnitId: "unit-old",
    unitConversions: [{ unitId: "unit-old" }],
  } as IngredientType;

  const updatedIngredient = {
    id: "ing-1",
    defaultUnitId: "unit-new",
    unitConversions: [{ unitId: "unit-old" }, { unitId: "unit-new" }],
  } as IngredientType;

  it("leaves unrelated rows unchanged", () => {
    const otherRow = { ...baseRow, id: "row-2", ingredientId: "ing-2" };
    const { rows, fixedRowsCount } = reconcileGroceryRowUnitsAfterIngredientUpdate({
      rows: [baseRow, otherRow],
      updatedIngredient: {
        id: "ing-1",
        defaultUnitId: "unit-new",
        unitConversions: [{ unitId: "unit-new" }],
      } as IngredientType,
    });

    expect(fixedRowsCount).toBe(1);
    expect(rows[0]?.unitId).toBe("unit-new");
    expect(rows[1]).toEqual(otherRow);
  });

  it("keeps valid unitId when still allowed", () => {
    const row = { ...baseRow, unitId: "unit-new" };
    const { rows, fixedRowsCount } = reconcileGroceryRowUnitsAfterIngredientUpdate({
      rows: [row],
      updatedIngredient: {
        id: "ing-1",
        defaultUnitId: "unit-new",
        unitConversions: [{ unitId: "unit-new" }],
      } as IngredientType,
    });

    expect(fixedRowsCount).toBe(0);
    expect(rows[0]?.unitId).toBe("unit-new");
  });

  it("auto-selects a newly added unit on the row that triggered the edit", () => {
    const { rows, newlyAddedUnitId } = reconcileGroceryRowUnitsAfterIngredientUpdate({
      rows: [baseRow],
      updatedIngredient,
      previousIngredient,
      targetRowId: "row-1",
    });

    expect(newlyAddedUnitId).toBe("unit-new");
    expect(rows[0]?.unitId).toBe("unit-new");
  });

  it("does not auto-select a new unit on other rows for the same ingredient", () => {
    const otherRow = { ...baseRow, id: "row-2", unitId: "unit-old" };
    const { rows } = reconcileGroceryRowUnitsAfterIngredientUpdate({
      rows: [baseRow, otherRow],
      updatedIngredient,
      previousIngredient,
      targetRowId: "row-1",
    });

    expect(rows[0]?.unitId).toBe("unit-new");
    expect(rows[1]?.unitId).toBe("unit-old");
  });
});
