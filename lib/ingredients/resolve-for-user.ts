type GroceryIngredientShape = {
  additionalInfo: string | null;
  substitutionsAllowed: boolean;
  substitutionNote: string | null;
} | null;

export type IngredientUserCustomizationRow = {
  supermarketUrl: string | null;
  additionalInfo: string | null;
};

type IngredientWithGrocery = {
  userId: string | null;
  supermarketUrl: string | null;
  groceryIngredient: GroceryIngredientShape;
};

/** Merge global ingredient data with a per-user shopping overlay. */
export function resolveIngredientForUser<T extends IngredientWithGrocery>(
  ingredient: T,
  customization: IngredientUserCustomizationRow | null | undefined,
): T & {
  isGlobal: boolean;
  hasUserCustomization: boolean;
} {
  const globalGrocery = ingredient.groceryIngredient;

  return {
    ...ingredient,
    supermarketUrl: customization?.supermarketUrl ?? ingredient.supermarketUrl,
    groceryIngredient: globalGrocery
      ? {
          ...globalGrocery,
          additionalInfo:
            customization?.additionalInfo ?? globalGrocery.additionalInfo,
        }
      : customization?.additionalInfo
        ? {
            additionalInfo: customization.additionalInfo,
            substitutionsAllowed: false,
            substitutionNote: null,
          }
        : null,
    isGlobal: ingredient.userId === null,
    hasUserCustomization: customization != null,
  };
}

export function hasShoppingOverlayValues(
  customization: IngredientUserCustomizationRow,
): boolean {
  return (
    customization.supermarketUrl != null || customization.additionalInfo != null
  );
}
