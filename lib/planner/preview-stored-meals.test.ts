import { describe, expect, it } from "vitest";
import type { StoredMealLotRow } from "@/lib/db/storage";
import type { SlotInputType } from "@/types/planner";
import { previewStoredMeals } from "./preview-stored-meals";

const recipe = { id: "recipe", isBatchRecipe: true } as NonNullable<SlotInputType["recipe"]>;
const slot = (id: string, audience: string[], overrides: Partial<SlotInputType> = {}): SlotInputType => ({
  placementId: id,
  date: new Date("2026-01-01"),
  mealType: "DINNER",
  recipe,
  customMeal: null,
  alternatives: [],
  used: false,
  cookingFamilyMemberIds: audience,
  batchGroupId: "batch",
  ...overrides,
});
const lot = (id: string, audience: string[], count = 1): StoredMealLotRow => ({
  id,
  count,
  version: 1,
  cookedAt: new Date(id === "old" ? "2026-01-01" : "2026-01-02"),
  recipe: { id: "recipe", name: "Recipe", slug: "recipe", archivedAt: null, excludeFromPlanner: false },
  audience: audience.map((member) => ({ id: member, name: member })),
  sourcePlan: null,
});

describe("previewStoredMeals", () => {
  it("prioritizes matching audiences before oldest fallback without changing the draft", () => {
    const plan = [slot("a", ["other"]), slot("b", ["alice"]), slot("c", ["other"])];
    const preview = previewStoredMeals(plan, [lot("new", ["alice"]), lot("old", ["other"])]);
    expect(preview.map((item) => item.alreadyCooked ?? false)).toEqual([true, true, false]);
    expect(preview.map((item) => item.batchGroupId)).toEqual([null, null, "batch"]);
    expect(plan.every((item) => !item.alreadyCooked && item.batchGroupId === "batch")).toBe(true);
  });

  it("reallocates after removal or audience changes and reserves lots for already cooked slots", () => {
    const plan = [
      slot("a", ["bob"]),
      slot("b", ["alice"]),
      slot("c", ["alice"], { alreadyCooked: true }),
      slot("d", ["alice"], { used: true }),
      slot("e", ["alice"], { placementId: null }),
      slot("f", ["alice"], { recipe: null }),
    ];
    const lots = [lot("old", ["alice"])];
    expect(previewStoredMeals(plan, lots)[1].batchGroupId).toBeNull();
    expect(previewStoredMeals(plan.slice(1), lots)[0].batchGroupId).toBeNull();
    const changed = [{ ...plan[0], cookingFamilyMemberIds: ["alice"] }, ...plan.slice(1)];
    expect(previewStoredMeals(changed, lots).map((item) => item.batchGroupId)).toEqual([null, "batch", "batch", "batch", "batch", "batch"]);
    const cookedFirst = [slot("cooked", ["alice"], { alreadyCooked: true }), slot("fresh", ["alice"])];
    expect(previewStoredMeals(cookedFirst, lots).map((item) => item.batchGroupId)).toEqual([null, "batch"]);
  });
});
