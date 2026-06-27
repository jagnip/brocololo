import type { GroceriesEditableRow } from "@/components/groceries/groceries-edit-types";
import { getDefaultUnitIdForIngredient } from "@/lib/ingredients/default-unit";
import type { IngredientType } from "@/types/ingredient";

type ReconcileResult = {
  rows: GroceriesEditableRow[];
  fixedRowsCount: number;
};

/** Reset invalid unitId on grocery rows when an ingredient's conversions change. */
export function reconcileGroceryRowUnitsAfterIngredientUpdate(params: {
  rows: GroceriesEditableRow[];
  updatedIngredient: IngredientType;
}): ReconcileResult {
  const allowedUnitIds = new Set(
    params.updatedIngredient.unitConversions.map((conversion) => conversion.unitId),
  );
  const fallbackUnitId = getDefaultUnitIdForIngredient({
    defaultUnitId: params.updatedIngredient.defaultUnitId,
    unitConversions: params.updatedIngredient.unitConversions,
  });

  let fixedRowsCount = 0;
  const rows = params.rows.map((row) => {
    if (row.ingredientId !== params.updatedIngredient.id) {
      return row;
    }

    if (row.unitId == null || allowedUnitIds.has(row.unitId)) {
      return row;
    }

    fixedRowsCount += 1;
    return {
      ...row,
      unitId: fallbackUnitId,
    };
  });

  return {
    rows,
    fixedRowsCount,
  };
}
