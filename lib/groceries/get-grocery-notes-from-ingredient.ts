type IngredientWithGroceryNotes = {
  groceryIngredient?: {
    additionalInfo: string | null;
    substitutionNote: string | null;
  } | null;
};

/** Ingredient-level grocery note defaults (per-user overlay already merged on fetch). */
export function getGroceryNotesFromIngredient(
  ingredient: IngredientWithGroceryNotes | Record<string, unknown>,
): {
  additionalInfo: string | null;
  substitutionNote: string | null;
} {
  return {
    additionalInfo:
      (ingredient as IngredientWithGroceryNotes).groceryIngredient?.additionalInfo ?? null,
    substitutionNote:
      (ingredient as IngredientWithGroceryNotes).groceryIngredient?.substitutionNote ?? null,
  };
}
