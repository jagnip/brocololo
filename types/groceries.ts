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

export type GrocerySlotData = {
  date: string;
  recipe: PlanSlotData["recipe"];
};

export type GroceryPlan = {
  slots: GrocerySlotData[];
  startDate: string;
  endDate: string;
};