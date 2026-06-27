import type {
  GroceriesEditableRow,
  GroceriesEditIngredientOption,
} from "@/components/groceries/groceries-edit-types";
import { getDefaultAmountAndUnitForGroceryAdd } from "@/lib/groceries/default-add-amount";

export type QuickAddDraft = {
  ingredientId: string | null;
  amount: number | null;
  unitId: string | null;
  additionalInfo: string | null;
  substitutionNote: string | null;
};

export type QuickAddRowDraft = Pick<
  QuickAddDraft,
  "amount" | "unitId" | "additionalInfo" | "substitutionNote"
>;

export const EMPTY_QUICK_ADD_DRAFT: QuickAddDraft = {
  ingredientId: null,
  amount: null,
  unitId: null,
  additionalInfo: null,
  substitutionNote: null,
};

export type AddIngredientToGroceriesResult =
  | { type: "duplicate"; existingRowId: string }
  | { type: "added"; newRow: GroceriesEditableRow }
  | { type: "not_found" };

/** Resolves how a DB ingredient should land on the grocery edit draft. */
export function resolveAddIngredientToGroceries(input: {
  ingredientId: string;
  rows: GroceriesEditableRow[];
  ingredient: GroceriesEditIngredientOption | undefined;
  createRowId?: () => string;
  draft?: QuickAddRowDraft;
}): AddIngredientToGroceriesResult {
  const existingRow = input.rows.find((row) => row.ingredientId === input.ingredientId);
  if (existingRow) {
    return { type: "duplicate", existingRowId: existingRow.id };
  }

  const ingredient = input.ingredient;
  if (!ingredient) {
    return { type: "not_found" };
  }

  const { unitId: defaultUnitId, amount: defaultAmount } = getDefaultAmountAndUnitForGroceryAdd({
    defaultUnitId: ingredient.defaultUnitId,
    unitConversions: ingredient.unitConversions.map((conversion) => ({
      unitId: conversion.unitId,
      unit: { name: conversion.unit.name },
    })),
  });

  const newRowId = input.createRowId?.() ?? crypto.randomUUID();
  const draft = input.draft;

  return {
    type: "added",
    newRow: {
      id: newRowId,
      isNew: true,
      ingredientId: ingredient.id,
      ingredientCategoryId: ingredient.categoryId,
      displayLabel: ingredient.name,
      amount: draft?.amount ?? defaultAmount,
      unitId: draft?.unitId ?? defaultUnitId,
      substitutionsAllowed: false,
      substitutionNote: draft?.substitutionNote?.trim() || null,
      additionalInfo: draft?.additionalInfo?.trim() || null,
      recipeAttribution: null,
    },
  };
}

/** Duplicates always scroll; new rows scroll only when the caller opts in (library "+"). */
export function shouldScrollAfterIngredientAdd(
  result: AddIngredientToGroceriesResult,
  scrollOnNewAdd: boolean,
): boolean {
  if (result.type === "duplicate") {
    return true;
  }
  if (result.type === "added") {
    return scrollOnNewAdd;
  }
  return false;
}
