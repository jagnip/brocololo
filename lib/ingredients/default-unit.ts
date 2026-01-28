type UnitConversionWithUnitName = {
  unitId: string;
  unit: { name: string };
};

export function buildDefaultUnitOptions(input: {
  conversions: Array<{ unitId: string | null | undefined }>;
  units: Array<{ id: string; name: string }>;
}) {
  const seenUnitIds = new Set<string>();
  // Keep options deterministic and deduped while users edit dynamic rows.
  return input.conversions
    .map((conversion) => conversion.unitId)
    .filter((unitId): unitId is string => {
      if (!unitId || seenUnitIds.has(unitId)) {
        return false;
      }
      seenUnitIds.add(unitId);
      return true;
    })
    .map((unitId) => ({
      value: unitId,
      label: input.units.find((unit) => unit.id === unitId)?.name ?? unitId,
    }));
}

export function getFallbackUnitIdFromConversions(
  unitConversions: UnitConversionWithUnitName[],
) {
  // Keep grams as the canonical fallback where available.
  const gramsConversion = unitConversions.find((conversion) => conversion.unit.name === "g");
  return gramsConversion?.unitId ?? unitConversions[0]?.unitId ?? null;
}

export function getFallbackUnitIdFromUnitIds(input: {
  unitIds: string[];
  gramsUnitId: string;
}) {
  // Ingredient form uses raw unit ids, so resolve fallback by grams id first.
  if (input.unitIds.includes(input.gramsUnitId)) {
    return input.gramsUnitId;
  }
  return input.unitIds[0] ?? null;
}

export function getDefaultUnitIdForIngredient(input: {
  defaultUnitId: string | null | undefined;
  unitConversions: UnitConversionWithUnitName[];
}) {
  const allowedUnitIds = new Set(
    input.unitConversions.map((conversion) => conversion.unitId),
  );

  // Explicit ingredient default should always win when valid.
  if (input.defaultUnitId && allowedUnitIds.has(input.defaultUnitId)) {
    return input.defaultUnitId;
  }

  return getFallbackUnitIdFromConversions(input.unitConversions);
}
