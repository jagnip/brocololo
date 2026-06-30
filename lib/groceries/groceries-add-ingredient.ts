import type {
  GroceriesEditableRow,
  GroceriesEditIngredientOption,
} from "@/components/groceries/groceries-edit-types";
import { getDefaultAmountAndUnitForGroceryAdd } from "@/lib/groceries/default-add-amount";
import { getGroceryNotesFromIngredient } from "@/lib/groceries/get-grocery-notes-from-ingredient";
import { deriveSubstitutionsAllowed } from "@/lib/groceries/substitutions";

export type QuickAddDraft = {
  ingredientId: string | null;
  displayLabel: string;
  ingredientCategoryId: string | null;
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
  displayLabel: "",
  ingredientCategoryId: null,
  amount: null,
  unitId: null,
  additionalInfo: null,
  substitutionNote: null,
};

export type AddIngredientToGroceriesResult =
  | { type: "duplicate"; existingRowId: string }
  | { type: "added"; newRow: GroceriesEditableRow }
  | { type: "not_found" };

export type AddFreeTextToGroceriesResult =
  | { type: "duplicate"; existingRowId: string }
  | { type: "added"; newRow: GroceriesEditableRow }
  | { type: "invalid" };

/** Trim + lowercase for free-text dedupe comparisons. */
export function normalizeGroceryDisplayLabel(label: string): string {
  return label.trim().toLowerCase();
}

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
  const noteDefaults = getGroceryNotesFromIngredient(ingredient);
  const additionalInfo = draft
    ? draft.additionalInfo?.trim() || null
    : noteDefaults.additionalInfo;
  const substitutionNote = draft
    ? draft.substitutionNote?.trim() || null
    : noteDefaults.substitutionNote;

  // Quick add passes a draft — use values literally (null unit/amount is intentional).
  const amount = draft !== undefined ? draft.amount : defaultAmount;
  const unitId = draft !== undefined ? draft.unitId : defaultUnitId;

  return {
    type: "added",
    newRow: {
      id: newRowId,
      isNew: true,
      ingredientId: ingredient.id,
      ingredientCategoryId: ingredient.categoryId,
      displayLabel: ingredient.name,
      amount,
      unitId,
      substitutionsAllowed: deriveSubstitutionsAllowed(substitutionNote),
      substitutionNote,
      additionalInfo,
      recipeAttribution: null,
    },
  };
}

/** Resolves how a free-text quick-add draft should land on the grocery edit list. */
export function resolveAddFreeTextToGroceries(input: {
  displayLabel: string;
  ingredientCategoryId: string | null;
  rows: GroceriesEditableRow[];
  createRowId?: () => string;
  draft?: QuickAddRowDraft;
}): AddFreeTextToGroceriesResult {
  const label = input.displayLabel.trim();
  const categoryId = input.ingredientCategoryId;
  if (!label || !categoryId) {
    return { type: "invalid" };
  }

  const normalizedLabel = normalizeGroceryDisplayLabel(label);
  const existingRow = input.rows.find(
    (row) =>
      !row.ingredientId &&
      row.ingredientCategoryId === categoryId &&
      normalizeGroceryDisplayLabel(row.displayLabel) === normalizedLabel,
  );
  if (existingRow) {
    return { type: "duplicate", existingRowId: existingRow.id };
  }

  const draft = input.draft;
  const substitutionNote = draft?.substitutionNote?.trim() || null;
  const additionalInfo = draft?.additionalInfo?.trim() || null;

  return {
    type: "added",
    newRow: {
      id: input.createRowId?.() ?? crypto.randomUUID(),
      isNew: true,
      ingredientId: null,
      ingredientCategoryId: categoryId,
      displayLabel: label,
      amount: draft?.amount ?? null,
      unitId: draft?.unitId ?? null,
      substitutionsAllowed: deriveSubstitutionsAllowed(substitutionNote),
      substitutionNote,
      additionalInfo,
      recipeAttribution: null,
    },
  };
}

type ScrollAfterAddResult = AddIngredientToGroceriesResult | AddFreeTextToGroceriesResult;

/** Duplicates always scroll; new rows scroll only when the caller opts in (library "+"). */
export function shouldScrollAfterIngredientAdd(
  result: ScrollAfterAddResult,
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
