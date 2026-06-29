type UnitConversionWithUnitName = {
  unitId: string;
  unit: { name: string };
};

/**
 * Default amount + unit when linking an ingredient (library "+", row selector).
 * Spotlight Quick add uses the same on select; Add item passes the draft through.
 *
 * Neither field is auto-filled — amount focus after select nudges the user to type.
 */
export function getDefaultAmountAndUnitForGroceryAdd(_input: {
  defaultUnitId: string | null | undefined;
  unitConversions: UnitConversionWithUnitName[];
}): { unitId: string | null; amount: number | null } {
  return { amount: null, unitId: null };
}
