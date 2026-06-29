import { describe, expect, it } from "vitest";
import {
  getGroceryRowPatchForLinkedIngredient,
  getQuickAddDraftForIngredient,
} from "@/lib/groceries/grocery-row-ingredient-patch";

function makeIngredient(overrides?: {
  groceryIngredient?: {
    additionalInfo: string | null;
    substitutionNote: string | null;
    substitutionsAllowed?: boolean;
  } | null;
}) {
  return {
    id: "ingredient-1",
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
    groceryIngredient: overrides?.groceryIngredient ?? null,
  } as const;
}

describe("getQuickAddDraftForIngredient", () => {
  it("prefills unit, amount, and grocery notes from ingredient defaults", () => {
    const ingredient = makeIngredient({
      groceryIngredient: {
        additionalInfo: "organic",
        substitutionNote: "or cherry tomatoes",
        substitutionsAllowed: true,
      },
    });

    expect(getQuickAddDraftForIngredient(ingredient)).toEqual({
      ingredientId: "ingredient-1",
      amount: 1,
      unitId: "unit-piece",
      additionalInfo: "organic",
      substitutionNote: "or cherry tomatoes",
    });
  });

  it("returns null notes when ingredient has no grocery shell", () => {
    const ingredient = makeIngredient({ groceryIngredient: null });

    expect(getQuickAddDraftForIngredient(ingredient)).toEqual({
      ingredientId: "ingredient-1",
      amount: 1,
      unitId: "unit-piece",
      additionalInfo: null,
      substitutionNote: null,
    });
  });

  it("stays aligned with category row patch fields", () => {
    const ingredient = makeIngredient({
      groceryIngredient: {
        additionalInfo: "ripe",
        substitutionNote: "or canned",
      },
    });

    const patch = getGroceryRowPatchForLinkedIngredient(ingredient);
    const draft = getQuickAddDraftForIngredient(ingredient);

    expect(draft).toEqual({
      ingredientId: patch.ingredientId,
      amount: patch.amount,
      unitId: patch.unitId,
      additionalInfo: patch.additionalInfo,
      substitutionNote: patch.substitutionNote,
    });
  });
});
