import type { GroceriesEditIngredientOption } from "@/components/groceries/groceries-edit-types";
import { getDefaultAmountAndUnitForGroceryAdd } from "@/lib/groceries/default-add-amount";
import { getGroceryNotesFromIngredient } from "@/lib/groceries/get-grocery-notes-from-ingredient";
import { deriveSubstitutionsAllowed } from "@/lib/groceries/substitutions";

/** Row patch when linking a DB ingredient (replaces unit, amount, and grocery notes). */
export function getGroceryRowPatchForLinkedIngredient(ingredient: GroceriesEditIngredientOption) {
  const { unitId, amount } = getDefaultAmountAndUnitForGroceryAdd({
    defaultUnitId: ingredient.defaultUnitId,
    unitConversions: ingredient.unitConversions.map((conversion) => ({
      unitId: conversion.unitId,
      unit: { name: conversion.unit.name },
    })),
  });
  const notes = getGroceryNotesFromIngredient(ingredient);

  return {
    ingredientId: ingredient.id,
    ingredientCategoryId: ingredient.categoryId,
    displayLabel: ingredient.name,
    unitId,
    amount,
    additionalInfo: notes.additionalInfo,
    substitutionNote: notes.substitutionNote,
    substitutionsAllowed: deriveSubstitutionsAllowed(notes.substitutionNote),
  };
}

/** Clears ingredient-linked fields when the user removes an ingredient from a row. */
export const CLEAR_GROCERY_ROW_INGREDIENT_PATCH = {
  ingredientId: null,
  displayLabel: "",
  unitId: null,
  amount: null,
  additionalInfo: null,
  substitutionNote: null,
  substitutionsAllowed: false,
} as const;
