import { describe, expect, it } from "vitest";
import { PlannerMealType } from "@/src/generated/enums";
import { createMockRecipe } from "@/lib/tests/test-helpers";
import type { PlanBatchInput, PlanInputType } from "@/types/planner";
import {
  detachMealFromBatch,
  ensureBatchAfterPlacement,
  getBatchMealTotal,
  mergeBatchStorageRow,
  transferRangeRemovedBatchMeals,
} from "./batch-storage";

const recipe = createMockRecipe({
  id: "recipe-batch",
  name: "Batch recipe",
  isBatchRecipe: true,
  plannedMealCount: 4,
});

function slot(day: number, audience: string[], batchGroupId = "batch-1") {
  return {
    date: new Date(Date.UTC(2026, 9, day)),
    mealType: PlannerMealType.DINNER,
    recipe,
    customMeal: null,
    alternatives: [],
    cookingFamilyMemberIds: audience,
    used: false,
    batchGroupId,
  };
}

const keyFor = (day: number) =>
  `${new Date(Date.UTC(2026, 9, day)).toISOString()}-DINNER`;

const batch: PlanBatchInput = {
  id: "batch-1",
  recipeId: recipe.id,
  storageRows: [{ count: 2, cookingFamilyMemberIds: ["jagoda", "nelson"] }],
  extraPortions: 1,
};

describe("batch storage lifecycle", () => {
  it("merges equivalent audiences without depending on member order", () => {
    expect(
      mergeBatchStorageRow(batch.storageRows, ["nelson", "jagoda"]),
    ).toEqual([
      { count: 3, cookingFamilyMemberIds: ["jagoda", "nelson"] },
    ]);
  });

  it("moves a removed scheduled meal into storage while siblings remain", () => {
    const plan: PlanInputType = [
      slot(19, ["jagoda"]),
      slot(20, ["jagoda"]),
    ];
    const result = detachMealFromBatch({
      plan,
      batches: [batch],
      slotKey: keyFor(19),
      fallbackFamilyMemberIds: ["jagoda", "nelson"],
    });

    expect(result[0]?.storageRows).toEqual([
      { count: 2, cookingFamilyMemberIds: ["jagoda", "nelson"] },
      { count: 1, cookingFamilyMemberIds: ["jagoda"] },
    ]);
  });

  it("deletes the entire batch when its final scheduled meal is removed", () => {
    expect(
      detachMealFromBatch({
        plan: [slot(19, ["jagoda"])],
        batches: [batch],
        slotKey: keyFor(19),
        fallbackFamilyMemberIds: ["jagoda", "nelson"],
      }),
    ).toEqual([]);
  });

  it("creates overflow storage and excludes extra portions from meal totals", () => {
    const plan = [slot(19, ["jagoda"]), slot(20, ["jagoda"])];
    const result = ensureBatchAfterPlacement({
      plan,
      batches: [],
      slotKey: keyFor(19),
      requestedMeals: 4,
      fallbackFamilyMemberIds: ["jagoda", "nelson"],
    });
    expect(result[0]?.storageRows).toEqual([
      { count: 2, cookingFamilyMemberIds: ["jagoda"] },
    ]);
    expect(getBatchMealTotal(plan, { ...result[0]!, extraPortions: 8 })).toBe(4);
  });

  it("consumes storage when another scheduled sibling joins the batch", () => {
    const previousPlan = [slot(19, ["jagoda"])];
    const result = ensureBatchAfterPlacement({
      previousPlan,
      plan: [...previousPlan, slot(20, ["jagoda"])],
      batches: [
        {
          ...batch,
          storageRows: [{ count: 3, cookingFamilyMemberIds: ["jagoda"] }],
        },
      ],
      slotKey: keyFor(20),
      requestedMeals: 4,
      fallbackFamilyMemberIds: ["jagoda", "nelson"],
    });
    expect(result[0]?.storageRows).toEqual([
      { count: 2, cookingFamilyMemberIds: ["jagoda"] },
    ]);
  });

  it("moves range-truncated audiences to storage but removes storage-only batches", () => {
    const previousPlan = [
      slot(19, ["jagoda"]),
      slot(20, ["jagoda", "nelson"]),
    ];
    expect(
      transferRangeRemovedBatchMeals({
        previousPlan,
        nextPlan: [slot(19, ["jagoda"])],
        batches: [{ ...batch, storageRows: [] }],
        fallbackFamilyMemberIds: ["jagoda", "nelson"],
      })[0]?.storageRows,
    ).toEqual([
      { count: 1, cookingFamilyMemberIds: ["jagoda", "nelson"] },
    ]);
    expect(
      transferRangeRemovedBatchMeals({
        previousPlan,
        nextPlan: [],
        batches: [batch],
        fallbackFamilyMemberIds: ["jagoda", "nelson"],
      }),
    ).toEqual([]);
  });
});
