import { describe, expect, it } from "vitest";
import type { GroceriesEditIngredientOption } from "@/components/groceries/groceries-edit-types";
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
}): GroceriesEditIngredientOption {
  return {
    id: "ingredient-1",
    userId: null,
    slug: "tomato",
    name: "Tomato",
    brand: null,
    descriptor: null,
    icon: null,
    supermarketUrl: null,
    calories: 18,
    proteins: 1,
    fats: 0,
    carbs: 4,
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
        ingredientId: "ingredient-1",
        unitId: "unit-piece",
        gramsPerUnit: 100,
        unit: { id: "unit-piece", name: "piece", namePlural: "pieces" },
      },
    ],
    groceryIngredient:
      overrides?.groceryIngredient == null
        ? null
        : {
            id: "grocery-ingredient-1",
            ingredientId: "ingredient-1",
            substitutionsAllowed: false,
            ...overrides.groceryIngredient,
          },
    isGlobal: true,
    hasUserCustomization: false,
  };
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
      displayLabel: "Tomato",
      ingredientCategoryId: "category-produce",
      amount: null,
      unitId: null,
      additionalInfo: "organic",
      substitutionNote: "or cherry tomatoes",
    });
  });

  it("returns null notes when ingredient has no grocery shell", () => {
    const ingredient = makeIngredient({ groceryIngredient: null });

    expect(getQuickAddDraftForIngredient(ingredient)).toEqual({
      ingredientId: "ingredient-1",
      displayLabel: "Tomato",
      ingredientCategoryId: "category-produce",
      amount: null,
      unitId: null,
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
      displayLabel: patch.displayLabel,
      ingredientCategoryId: patch.ingredientCategoryId,
      amount: patch.amount,
      unitId: patch.unitId,
      additionalInfo: patch.additionalInfo,
      substitutionNote: patch.substitutionNote,
    });
  });
});
