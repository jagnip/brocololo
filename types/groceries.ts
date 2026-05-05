export type ShoppingListGeneratedLine = {
  ingredientName: string;
  ingredientIcon: string | null;
  supermarketUrl: string | null;
  amount: number | null;
  unitName: string | null;
  recipeNames: string[];
  categoryName: string;
  categorySortOrder: number;
  ingredientId: string;
  ingredientCategoryId: string;
  /** Null when amounts were rolled up to grams; resolve unit id in DB via Unit.name === "g". */
  unitId: string | null;
};