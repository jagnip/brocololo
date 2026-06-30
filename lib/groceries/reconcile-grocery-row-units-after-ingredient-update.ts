import type { GroceriesEditableRow } from "@/components/groceries/groceries-edit-types";
import { getDefaultUnitIdForIngredient } from "@/lib/ingredients/default-unit";
import type { IngredientType } from "@/types/ingredient";

type IngredientUnitSnapshot = Pick<IngredientType, "unitConversions" | "defaultUnitId">;

type ReconcileResult = {
  rows: GroceriesEditableRow[];
  fixedRowsCount: number;
  /** Unit id added in this save, for quick-add or other UI that tracks edit source. */
  newlyAddedUnitId: string | null;
};

/** Pick the unit the user most likely just added while editing an ingredient. */
export function getNewlyAddedUnitId(
  previousIngredient: IngredientUnitSnapshot | null | undefined,
  updatedIngredient: IngredientUnitSnapshot,
): string | null {
  const previousUnitIds = new Set(
    previousIngredient?.unitConversions.map((conversion) => conversion.unitId) ?? [],
  );
  const newlyAddedUnitIds = updatedIngredient.unitConversions
    .map((conversion) => conversion.unitId)
    .filter((unitId) => !previousUnitIds.has(unitId));

  if (newlyAddedUnitIds.length === 0) {
    return null;
  }
  if (newlyAddedUnitIds.length === 1) {
    return newlyAddedUnitIds[0] ?? null;
  }
  if (newlyAddedUnitIds.includes(updatedIngredient.defaultUnitId)) {
    return updatedIngredient.defaultUnitId;
  }
  return newlyAddedUnitIds[newlyAddedUnitIds.length - 1] ?? null;
}

/** Reset invalid unitId on grocery rows when an ingredient's conversions change. */
export function reconcileGroceryRowUnitsAfterIngredientUpdate(params: {
  rows: GroceriesEditableRow[];
  updatedIngredient: IngredientType;
  previousIngredient?: IngredientUnitSnapshot | null;
  /** When set, auto-select a newly added unit on this row only. */
  targetRowId?: string | null;
}): ReconcileResult {
  const allowedUnitIds = new Set(
    params.updatedIngredient.unitConversions.map((conversion) => conversion.unitId),
  );
  const fallbackUnitId = getDefaultUnitIdForIngredient({
    defaultUnitId: params.updatedIngredient.defaultUnitId,
    unitConversions: params.updatedIngredient.unitConversions,
  });
  const newlyAddedUnitId = getNewlyAddedUnitId(
    params.previousIngredient,
    params.updatedIngredient,
  );

  let fixedRowsCount = 0;
  const rows = params.rows.map((row) => {
    if (row.ingredientId !== params.updatedIngredient.id) {
      return row;
    }

    // After saving a new conversion from this row's edit dialog, select that unit.
    if (
      newlyAddedUnitId &&
      params.targetRowId &&
      row.id === params.targetRowId
    ) {
      return {
        ...row,
        unitId: newlyAddedUnitId,
      };
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
    newlyAddedUnitId,
  };
}
