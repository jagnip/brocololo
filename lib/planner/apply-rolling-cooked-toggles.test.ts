import { describe, expect, it } from "vitest";
import { createMockRecipe } from "@/lib/tests/test-helpers";
import type { RollingMealType } from "@/lib/validations/planner";
import type { PlanBatchInput, PlanInputType } from "@/types/planner";
import { applyRollingCookedToggles } from "./apply-rolling-cooked-toggles";

const claim = { id: "queue", version: 4 };
const recipe = createMockRecipe({ id: "soup", isBatchRecipe: true });
const entries = [{ kind: "recipe", recipeId: recipe.id, meals: 5, alreadyCooked: false }] satisfies RollingMealType[];
const plan: PlanInputType = [false, true].map((alreadyCooked, index) => ({
  date: new Date(`2026-03-${17 + index}T00:00:00.000Z`),
  mealType: "DINNER",
  placementId: `placement-${index}`,
  recipe,
  customMeal: null,
  alternatives: [],
  used: false,
  isRolledOver: true,
  alreadyCooked,
  batchGroupId: alreadyCooked ? "stored" : "planned",
  rollingQueueClaim: alreadyCooked ? null : claim,
}));
const batches: PlanBatchInput[] = [{
  id: "planned",
  recipeId: recipe.id,
  rollingQueueClaim: claim,
  storageRows: [{ count: 3, cookingFamilyMemberIds: ["self"] }],
}];

describe("applyRollingCookedToggles", () => {
  it("preserves mixed cooked sources and claims on quantity changes and removal", () => {
    for (const next of [[{ ...entries[0], meals: 2 }], []]) {
      const result = applyRollingCookedToggles(plan, batches, entries, next);
      expect(result.plan).toBe(plan);
      expect(result.batches).toBe(batches);
      expect(result.plan.map((slot) => slot.alreadyCooked)).toEqual([false, true]);
    }
  });

  it("detaches claims and drops planned remainder only on an explicit cooked toggle", () => {
    const result = applyRollingCookedToggles(plan, batches, entries, [{ ...entries[0], alreadyCooked: true }]);
    expect(result.plan.map((slot) => slot.alreadyCooked)).toEqual([true, true]);
    expect(result.plan.every((slot) => slot.rollingQueueClaim == null)).toBe(true);
    expect(result.batches).toEqual([{ ...batches[0], rollingQueueClaim: null, storageRows: [] }]);
    expect(batches[0].storageRows).toHaveLength(1);
    expect(plan[0].rollingQueueClaim).toEqual(claim);

    const undone = applyRollingCookedToggles(result.plan, result.batches,
      [{ ...entries[0], alreadyCooked: true }], entries, result.backup);
    expect(undone.plan.map((slot) => slot.alreadyCooked)).toEqual([false, false]);
    expect(undone.plan[0]).toEqual(plan[0]);
    expect(undone.plan[1]).toMatchObject({ isRolledOver: false, rollingQueueClaim: null });
    expect(undone.batches).toEqual(batches);
    expect(undone.backup.placements.size).toBe(0);
    expect(undone.backup.batches.size).toBe(0);
  });

  it("restores each uncooked source's exact claim, remainder and audience across quantity edits and moves", () => {
    const secondClaim = { id: "other-queue", version: 7 };
    const secondSlot = { ...plan[0], placementId: "other-placement", batchGroupId: "other-batch", rollingQueueClaim: secondClaim };
    const secondBatch = {
      ...batches[0], id: "other-batch", rollingQueueClaim: secondClaim,
      storageRows: [{ count: 2, cookingFamilyMemberIds: ["other"] }, { count: 1, cookingFamilyMemberIds: ["self", "other"] }],
    };
    const originalPlan = [...plan, secondSlot];
    const originalBatches = [...batches, secondBatch];
    const cookedEntries = [{ ...entries[0], alreadyCooked: true }];
    const cooked = applyRollingCookedToggles(originalPlan, originalBatches, entries, cookedEntries);
    const resized = applyRollingCookedToggles(cooked.plan, cooked.batches, cookedEntries,
      [{ ...cookedEntries[0], meals: 2 }], cooked.backup);
    const moved = resized.plan.map((slot) => ({ ...slot, date: new Date("2026-04-01") }));
    const undone = applyRollingCookedToggles(moved, resized.batches, cookedEntries, entries, resized.backup);
    expect(undone.plan.map((slot) => slot.rollingQueueClaim)).toEqual([claim, null, secondClaim]);
    expect(undone.plan.map((slot) => slot.isRolledOver)).toEqual([true, false, true]);
    expect(undone.batches).toEqual(originalBatches);
    expect(cooked.backup.placements.size).toBe(2);
  });

  it("does not restore a removed placement's provenance to its same-recipe replacement", () => {
    const cookedEntries = [{ ...entries[0], alreadyCooked: true }];
    const cooked = applyRollingCookedToggles(plan, batches, entries, cookedEntries);
    const replacement = cooked.plan.map((slot) => ({ ...slot, placementId: "replacement" }));
    const undone = applyRollingCookedToggles(replacement, cooked.batches, cookedEntries, entries, cooked.backup);
    expect(undone.plan.every((slot) => !slot.isRolledOver && slot.rollingQueueClaim == null)).toBe(true);
    expect(undone.batches[0].storageRows).toEqual([]);
  });

  it("normalizes originally cooked sources as fresh when no draft backup exists", () => {
    const cookedEntries = [{ ...entries[0], alreadyCooked: true }];
    const cooked = applyRollingCookedToggles(plan, batches, entries, cookedEntries);
    const fresh = applyRollingCookedToggles(cooked.plan, cooked.batches, cookedEntries, entries);
    expect(fresh.plan.every((slot) => !slot.alreadyCooked && !slot.isRolledOver && slot.rollingQueueClaim == null)).toBe(true);
    expect(fresh.batches[0]).toMatchObject({ rollingQueueClaim: null, storageRows: [] });
  });

  it("does not treat adding an already-cooked selection as a toggle", () => {
    expect(applyRollingCookedToggles(plan, batches, [], [{ ...entries[0], alreadyCooked: true }]).plan).toBe(plan);
  });

  it("leaves fresh slots, non-batch repeats and other batches unchanged", () => {
    const untouched = [
      { ...plan[0], isRolledOver: false, batchGroupId: "fresh" },
      { ...plan[0], recipe: { ...recipe, isBatchRecipe: false }, batchGroupId: null },
    ];
    const otherBatch = { ...batches[0], id: "fresh" };
    const result = applyRollingCookedToggles([...plan, ...untouched], [...batches, otherBatch], entries,
      [{ ...entries[0], alreadyCooked: true }]);
    expect(result.plan.slice(2)).toEqual(untouched);
    expect(result.batches[1]).toBe(otherBatch);
  });
});
