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
