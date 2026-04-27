/**
 * Combines ingredient name with optional descriptor and brand for display in
 * string-only selectors and labels.
 */
export function getIngredientDisplayName(
  name: string,
  brand: string | null,
  descriptor?: string | null,
): string {
  const normalizedDescriptor = descriptor?.trim();
  const normalizedBrand = brand?.trim();
  const descriptorPart = normalizedDescriptor ? ` (${normalizedDescriptor})` : "";
  const brandPart = normalizedBrand ? ` (${normalizedBrand})` : "";
  return `${name}${descriptorPart}${brandPart}`;
}

export function getIngredientSelectorDisplay(input: {
  name: string;
  brand?: string | null;
  descriptor?: string | null;
}) {
  const details = [input.descriptor, input.brand]
    .map((detail) => detail?.trim())
    .filter((detail): detail is string => Boolean(detail));
  const detailsText = details.length > 0 ? details.join(", ") : null;

  return {
    label: detailsText ? `${input.name} (${detailsText})` : input.name,
    detailsText,
  };
}

export function getIngredientTitleParts(input: {
  name: string;
  brand?: string | null;
  descriptor?: string | null;
}) {
  return {
    name: input.name,
    // Keep brackets as presentation so descriptor stays clean in storage.
    descriptor: input.descriptor?.trim() ? `(${input.descriptor.trim()})` : null,
    brand: input.brand?.trim() ? `(${input.brand.trim()})` : null,
  };
}
