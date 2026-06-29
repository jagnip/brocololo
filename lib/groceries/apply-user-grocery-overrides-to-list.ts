type IngredientCustomization = {
  supermarketUrl: string | null;
  additionalInfo: string | null;
  substitutionNote: string | null;
};

type ListItemWithGlobalIngredient = {
  additionalInfo: string | null;
  substitutionsAllowed: boolean;
  substitutionNote: string | null;
  groceryIngredient: {
    ingredient: {
      id: string;
      userId: string | null;
      supermarketUrl: string | null;
    };
  } | null;
};

/**
 * Merge per-user shopping overlay onto list items for global catalog ingredients.
 * List-item additionalInfo/substitutionNote are authoritative snapshots — only
 * supermarketUrl on the nested ingredient is overridden for display links.
 */
export function applyUserGroceryOverridesToListItems<T extends ListItemWithGlobalIngredient>(
  items: T[],
  customizationMap: Map<string, IngredientCustomization>,
): T[] {
  return items.map((item) => {
    const ingredient = item.groceryIngredient?.ingredient;
    if (!ingredient || ingredient.userId !== null) {
      return item;
    }

    const overlay = customizationMap.get(ingredient.id);

    return {
      ...item,
      groceryIngredient: {
        ...item.groceryIngredient!,
        ingredient: {
          ...ingredient,
          supermarketUrl: overlay?.supermarketUrl ?? null,
        },
      },
    };
  });
}
