import { describe, expect, it } from "vitest";
import { getGroceriesLayoutDisplayFingerprint } from "@/lib/groceries/layout-display-fingerprint";

function makeList(overrides: {
  activeLayoutPresetId?: string;
  layoutPresets?: Array<{ id: string; name: string; isBuiltIn: boolean }>;
  items?: Array<{ ingredientCategoryId: string; category: { name: string } }>;
  effectiveCategoryOrderIds?: string[];
}) {
  return {
    activeLayoutPresetId: overrides.activeLayoutPresetId ?? "preset-default",
    layoutPresets: overrides.layoutPresets ?? [
      { id: "preset-default", name: "Default", isBuiltIn: true },
    ],
    items: overrides.items ?? [
      { ingredientCategoryId: "cat-a", category: { name: "Produce" } },
      { ingredientCategoryId: "cat-b", category: { name: "Dairy" } },
    ],
    effectiveCategoryOrderIds: overrides.effectiveCategoryOrderIds ?? ["cat-a", "cat-b"],
  } as Parameters<typeof getGroceriesLayoutDisplayFingerprint>[0];
}

describe("getGroceriesLayoutDisplayFingerprint", () => {
  it("changes when visible section order changes", () => {
    const before = makeList({
      items: [
        { ingredientCategoryId: "cat-a", category: { name: "Produce" } },
        { ingredientCategoryId: "cat-b", category: { name: "Dairy" } },
      ],
    });
    const after = makeList({
      items: [
        { ingredientCategoryId: "cat-b", category: { name: "Dairy" } },
        { ingredientCategoryId: "cat-a", category: { name: "Produce" } },
      ],
    });

    expect(getGroceriesLayoutDisplayFingerprint(before)).not.toBe(
      getGroceriesLayoutDisplayFingerprint(after),
    );
  });

  it("changes when a custom preset is removed", () => {
    const before = makeList({
      layoutPresets: [
        { id: "preset-default", name: "Default", isBuiltIn: true },
        { id: "preset-custom", name: "Weekend", isBuiltIn: false },
      ],
    });
    const after = makeList({
      layoutPresets: [{ id: "preset-default", name: "Default", isBuiltIn: true }],
    });

    expect(getGroceriesLayoutDisplayFingerprint(before)).not.toBe(
      getGroceriesLayoutDisplayFingerprint(after),
    );
  });
});
