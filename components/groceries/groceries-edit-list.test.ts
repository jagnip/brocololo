import { describe, expect, it } from "vitest";
import {
  hasGroceriesEditChanges,
  toComparableRows,
} from "@/components/groceries/groceries-edit-list";

function makeRow(overrides?: Partial<ReturnType<typeof makeBaseRow>>) {
  return { ...makeBaseRow(), ...overrides };
}

function makeBaseRow() {
  return {
    id: "item-1",
    isNew: false,
    ingredientId: "ingredient-1",
    ingredientCategoryId: "category-1",
    displayLabel: "Tomato",
    amount: 120,
    unitId: "unit-g",
    substitutionsAllowed: false,
    substitutionNote: null,
    additionalInfo: null,
    recipeAttribution: null,
  };
}

describe("toComparableRows", () => {
  it("normalizes order by id", () => {
    const rows = [
      makeRow({ id: "item-2", displayLabel: "B" }),
      makeRow({ id: "item-1", displayLabel: "A" }),
    ];

    const comparable = toComparableRows(rows);
    expect(comparable.map((row) => row.id)).toEqual(["item-1", "item-2"]);
  });
});

describe("hasGroceriesEditChanges", () => {
  it("returns false when rows are semantically unchanged", () => {
    const initial = [makeRow()];
    const current = [makeRow()];
    expect(hasGroceriesEditChanges(initial, current)).toBe(false);
  });

  it("returns true when ingredient changes", () => {
    const initial = [makeRow()];
    const current = [makeRow({ ingredientId: "ingredient-2" })];
    expect(hasGroceriesEditChanges(initial, current)).toBe(true);
  });
});
