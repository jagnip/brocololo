type UnitConversionWithUnitName = {
  unitId: string;
  unit: { name: string };
};

/**
 * Default amount + unit when linking an ingredient (library "+", row selector).
 * Spotlight Quick add uses the same on select; Add item passes the draft through.
 *
 * Amount defaults to 1; unit is never auto-filled — user picks how they shop.
 */
export function getDefaultAmountAndUnitForGroceryAdd(_input: {
  defaultUnitId: string | null | undefined;
  unitConversions: UnitConversionWithUnitName[];
}): { unitId: string | null; amount: number | null } {
  return { amount: 1, unitId: null };
}
