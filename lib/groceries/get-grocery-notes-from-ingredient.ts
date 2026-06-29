type IngredientWithGroceryNotes = {
  groceryIngredient?: {
    additionalInfo: string | null;
    substitutionNote: string | null;
  } | null;
};

/** Ingredient-level grocery note defaults (per-user overlay already merged on fetch). */
export function getGroceryNotesFromIngredient(ingredient: IngredientWithGroceryNotes): {
  additionalInfo: string | null;
  substitutionNote: string | null;
} {
  return {
    additionalInfo: ingredient.groceryIngredient?.additionalInfo ?? null,
    substitutionNote: ingredient.groceryIngredient?.substitutionNote ?? null,
  };
}
