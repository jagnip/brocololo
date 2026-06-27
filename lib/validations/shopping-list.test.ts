import { describe, expect, it } from "vitest";
import {
  saveShoppingListEditsSchema,
  shoppingListEditableItemSchema,
} from "@/lib/validations/shopping-list";

function makeValidRow() {
  return {
    id: "item-1",
    isNew: false,
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

  it("derives substitutionsAllowed from substitution note", () => {
    const withNote = shoppingListEditableItemSchema.parse({
      ...makeValidRow(),
      substitutionsAllowed: false,
      substitutionNote: "Cherry tomato",
    });
    expect(withNote.substitutionsAllowed).toBe(true);

    const withoutNote = shoppingListEditableItemSchema.parse({
      ...makeValidRow(),
      substitutionsAllowed: true,
      substitutionNote: null,
    });
    expect(withoutNote.substitutionsAllowed).toBe(false);
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

  it("accepts explicit deletedItemIds for trash removals", () => {
    const result = saveShoppingListEditsSchema.safeParse({
      planId: "plan-1",
      deletedItemIds: ["item-1", "item-2"],
      items: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deletedItemIds).toEqual(["item-1", "item-2"]);
    }
  });

  it("defaults deletedItemIds to empty when omitted", () => {
    const result = saveShoppingListEditsSchema.safeParse({
      planId: "plan-1",
      items: [makeValidRow()],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deletedItemIds).toEqual([]);
    }
  });
});
