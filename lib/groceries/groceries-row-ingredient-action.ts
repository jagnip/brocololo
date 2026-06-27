/** Which inline ingredient action applies to a grocery edit row. */
export type GroceriesRowIngredientActionState = "none" | "create" | "edit";

type RowWithIngredientSelection = {
  ingredientId: string | null;
  displayLabel: string;
};

/**
 * Free-text rows (displayLabel, no ingredientId) → create.
 * Linked DB rows → edit. Empty rows → none.
 */
export function getGroceriesRowIngredientActionState(
  row: RowWithIngredientSelection,
): GroceriesRowIngredientActionState {
  if (row.ingredientId) {
    return "edit";
  }
  if (row.displayLabel.trim()) {
    return "create";
  }
  return "none";
}

export function canManageGroceriesRowIngredient(row: RowWithIngredientSelection): boolean {
  return getGroceriesRowIngredientActionState(row) !== "none";
}
