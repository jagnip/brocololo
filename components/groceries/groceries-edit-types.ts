import type { getIngredients } from "@/lib/db/ingredients";
import type { getShoppingListByPlanId } from "@/lib/db/shopping-list";
import type { getUnits } from "@/lib/db/units";

export type GroceriesEditListModel = NonNullable<
  Awaited<ReturnType<typeof getShoppingListByPlanId>>
>;

export type GroceriesEditIngredientOption = Awaited<
  ReturnType<typeof getIngredients>
>[number];

export type GroceriesEditUnitOption = Awaited<ReturnType<typeof getUnits>>[number];

export type GroceriesEditableRow = {
  id: string;
  ingredientId: string;
  ingredientCategoryId: string;
  displayLabel: string;
  amount: number | null;
  unitId: string | null;
  substitutionsAllowed: boolean;
  substitutionNote: string | null;
  additionalInfo: string | null;
};
