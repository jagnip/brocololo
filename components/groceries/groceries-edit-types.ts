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
  // True when this row was added in the form and hasn't been persisted yet.
  // The id is a temp UUID generated client-side; the server creates the real
  // DB row on save. False once a row has been hydrated from the database.
  isNew: boolean;
  ingredientId: string | null;
  ingredientCategoryId: string;
  displayLabel: string;
  amount: number | null;
  unitId: string | null;
  substitutionsAllowed: boolean;
  substitutionNote: string | null;
  additionalInfo: string | null;
  // Comma-joined recipe names captured when the shopping list was generated.
  // Display-only in the edit UI; never sent in the save payload.
  recipeAttribution: string | null;
};
