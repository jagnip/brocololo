import { getDefaultUnitIdForIngredient } from "@/lib/ingredients/default-unit";

type UnitConversionWithUnitName = {
  unitId: string;
  unit: { name: string };
};

// Shopping-by-count units in priority order. Weight/volume/recipe-scale units
// (g, ml, tsp, pinch, etc.) are intentionally excluded from auto-amount.
const COUNTABLE_UNIT_PRIORITY = [
  "piece",
  "pieces",
  "clove",
  "stick",
  "leaf",
  "leaves",
  "handful",
  "ring",
] as const;

function normalizeUnitName(unitName: string): string {
  return unitName.trim().toLowerCase();
}

function pickCountableUnitId(
  unitConversions: UnitConversionWithUnitName[],
): string | null {
  const byNormalizedName = new Map(
    unitConversions.map((conversion) => [
      normalizeUnitName(conversion.unit.name),
      conversion.unitId,
    ]),
  );

  for (const unitName of COUNTABLE_UNIT_PRIORITY) {
    const unitId = byNormalizedName.get(unitName);
    if (unitId) return unitId;
  }

  return null;
}

/**
 * Default unit + amount when pushing an ingredient into the grocery edit list
 * (library "+" or picking an ingredient in an empty row).
 *
 * Countable units get amount 1; grams-only / volume items keep amount empty.
 */
export function getDefaultAmountAndUnitForGroceryAdd(input: {
  defaultUnitId: string | null | undefined;
  unitConversions: UnitConversionWithUnitName[];
}): { unitId: string | null; amount: number | null } {
  const countableUnitId = pickCountableUnitId(input.unitConversions);
  if (countableUnitId) {
    return { unitId: countableUnitId, amount: 1 };
  }

  return {
    unitId: getDefaultUnitIdForIngredient(input),
    amount: null,
  };
}
