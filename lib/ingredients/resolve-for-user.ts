import { deriveSubstitutionsAllowed } from "@/lib/groceries/substitutions";

type GroceryIngredientShape = {
  additionalInfo: string | null;
  substitutionsAllowed: boolean;
  substitutionNote: string | null;
} | null;

export type IngredientUserCustomizationRow = {
  supermarketUrl: string | null;
  additionalInfo: string | null;
  substitutionNote: string | null;
};

type IngredientWithGrocery = {
  userId: string | null;
  supermarketUrl: string | null;
  groceryIngredient: GroceryIngredientShape;
};

/** Merge per-user shopping overlay for global catalog ingredients. */
export function resolveIngredientForUser<T extends IngredientWithGrocery>(
  ingredient: T,
  customization: IngredientUserCustomizationRow | null | undefined,
): T & {
  isGlobal: boolean;
  hasUserCustomization: boolean;
} {
  const isGlobal = ingredient.userId === null;

  // Private ingredients keep canonical grocery fields on the ingredient row.
  if (!isGlobal) {
    return {
      ...ingredient,
      isGlobal: false,
      hasUserCustomization: false,
    };
  }

  const substitutionNote = customization?.substitutionNote ?? null;
  const hasGroceryShell = ingredient.groceryIngredient != null;

  return {
    ...ingredient,
    // Global ingredients never read canonical grocery URL — overlay only.
    supermarketUrl: customization?.supermarketUrl ?? null,
    groceryIngredient:
      hasGroceryShell || customization != null
        ? {
            additionalInfo: customization?.additionalInfo ?? null,
            substitutionNote,
            substitutionsAllowed: deriveSubstitutionsAllowed(substitutionNote),
          }
        : null,
    isGlobal: true,
    hasUserCustomization: customization != null,
  };
}

export function hasShoppingOverlayValues(
  customization: IngredientUserCustomizationRow,
): boolean {
  return (
    customization.supermarketUrl != null ||
    customization.additionalInfo != null ||
    customization.substitutionNote != null
  );
}
