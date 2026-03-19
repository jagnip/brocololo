/**
 * Combines ingredient name with optional brand for display in selectors
 * and labels. Returns "Name (Brand)" when brand is present, or just "Name".
 */
export function getIngredientDisplayName(
  name: string,
  brand: string | null,
): string {
  return brand ? `${name} (${brand})` : name;
}
