import { describe, expect, it } from "vitest";
import { getGroceryNotesFromIngredient } from "@/lib/groceries/get-grocery-notes-from-ingredient";

describe("getGroceryNotesFromIngredient", () => {
  it("returns grocery note defaults from groceryIngredient", () => {
    expect(
      getGroceryNotesFromIngredient({
        groceryIngredient: {
          additionalInfo: "organic",
          substitutionNote: "or cherry tomatoes",
        },
      }),
    ).toEqual({
      additionalInfo: "organic",
      substitutionNote: "or cherry tomatoes",
    });
  });

  it("returns nulls when groceryIngredient is missing", () => {
    expect(getGroceryNotesFromIngredient({})).toEqual({
      additionalInfo: null,
      substitutionNote: null,
    });
  });
});
