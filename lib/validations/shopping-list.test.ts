import { describe, expect, it } from "vitest";
import {
  saveShoppingListEditsSchema,
  shoppingListEditableItemSchema,
} from "@/lib/validations/shopping-list";

function makeValidRow() {
  return {
    id: "item-1",
    ingredientId: "ingredient-1",
    ingredientCategoryId: "category-1",
    displayLabel: "Tomato",
    unitId: "unit-g",
    amount: 120,
    additionalInfo: "Ripe only",
    substitutionsAllowed: true,
    substitutionNote: "Cherry tomato",
  };
}

describe("shoppingListEditableItemSchema", () => {
  it("accepts a valid editable row", () => {
    const result = shoppingListEditableItemSchema.safeParse(makeValidRow());
    expect(result.success).toBe(true);
  });

  it("rejects amount without unit", () => {
    const result = shoppingListEditableItemSchema.safeParse({
      ...makeValidRow(),
      unitId: null,
      amount: 120,
    });
    expect(result.success).toBe(false);
  });

  it("rejects unit without amount", () => {
    const result = shoppingListEditableItemSchema.safeParse({
      ...makeValidRow(),
      unitId: "unit-g",
      amount: null,
    });
    expect(result.success).toBe(false);
  });

  it("enforces substitution note max length", () => {
    const result = shoppingListEditableItemSchema.safeParse({
      ...makeValidRow(),
      substitutionNote: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("accepts free-text row without ingredient id", () => {
    const result = shoppingListEditableItemSchema.safeParse({
      ...makeValidRow(),
      ingredientId: null,
      displayLabel: "One-off sauce",
      unitId: null,
      amount: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("saveShoppingListEditsSchema", () => {
  it("accepts payload with at least one row", () => {
    const result = saveShoppingListEditsSchema.safeParse({
      planId: "plan-1",
      items: [makeValidRow()],
    });
    expect(result.success).toBe(true);
  });
});
