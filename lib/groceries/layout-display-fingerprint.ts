import type { GroceriesPersistedListModel } from "@/components/groceries/groceries-persisted-list";

/** Fingerprint of layout-affecting list data; changes when sections reorder or presets change. */
export function getGroceriesLayoutDisplayFingerprint(
  list: GroceriesPersistedListModel,
): string {
  const sectionCategoryIds: string[] = [];
  let lastSectionTitle = "";

  for (const item of list.items) {
    const sectionTitle = item.category.name;
    if (sectionTitle !== lastSectionTitle) {
      sectionCategoryIds.push(item.ingredientCategoryId);
      lastSectionTitle = sectionTitle;
    }
  }

  const presetSignature = list.layoutPresets
    .map((preset) => `${preset.id}:${preset.name}:${preset.isBuiltIn}`)
    .sort()
    .join(",");

  return [
    list.activeLayoutPresetId ?? "",
    presetSignature,
    sectionCategoryIds.join(","),
    (list.effectiveCategoryOrderIds ?? []).join(","),
  ].join("|");
}
