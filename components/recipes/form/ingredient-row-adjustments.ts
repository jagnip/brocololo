import type { IngredientType } from "@/types/ingredient";
import type { RecipeIngredientInputType } from "@/lib/validations/recipe";
import { getDefaultUnitIdForIngredient } from "@/lib/ingredients/default-unit";

type ReconcileResult = {
  rows: RecipeIngredientInputType[];
  fixedRowsCount: number;
};

export function reconcileIngredientUnitsAfterUpdate(params: {
  rows: RecipeIngredientInputType[];
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
    // Keep fallback deterministic when conversions change after ingredient edit.
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
