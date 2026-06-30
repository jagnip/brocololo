export type UnitLabelFields = {
  name: string;
  namePlural: string | null;
};

type UnitConversionForResolve = {
  unitId: string;
  unit?: UnitLabelFields | null;
};

/**
 * Resolve unit labels for a grocery ingredient conversion.
 * Prefer nested unit on the conversion (fresh after inline ingredient save);
 * fall back to the static page-level map for older or partial payloads.
 */
export function resolveUnitForConversion(
  conversion: UnitConversionForResolve,
  unitById: Map<string, UnitLabelFields>,
): UnitLabelFields | null {
  if (conversion.unit) {
    return conversion.unit;
  }

  return unitById.get(conversion.unitId) ?? null;
}
