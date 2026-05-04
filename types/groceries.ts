import { PlanSlotData } from "@/lib/groceries/helpers";

export type GroceryItem = {
  ingredientName: string;
  ingredientIcon: string | null;
  supermarketUrl: string | null;
  amount: number | null;
  unitName: string | null;
  recipeNames: string[];
  categoryName: string;
  categorySortOrder: number;
};

/** Aggregated planner line with FKs for persisting shopping_list_items. */
export type ShoppingListGeneratedLine = GroceryItem & {
  ingredientId: string;
  ingredientCategoryId: string;
  /** Null when amounts were rolled up to grams; resolve unit id in DB via Unit.name === "g". */
  unitId: string | null;
};