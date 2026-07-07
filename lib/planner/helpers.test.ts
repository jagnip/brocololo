import { describe, expect, it } from "vitest";
import { PlannerMealType } from "@/src/generated/enums";
import {
  getOrderedPlanSlots,
  getPlannerMealCountForAudience,
  markBatchSlots,
} from "@/lib/planner/helpers";
import type { RecipeType } from "@/types/recipe";

describe("getPlannerMealCountForAudience", () => {
  it("counts meals by selected planner audience size", () => {
    // A six-serving recipe feeds three selected people for two planned meals.
    expect(getPlannerMealCountForAudience({ servings: 6 }, 3)).toBe(2);
  });

  it("does not use member appetite multipliers for planner meal count", () => {
    // Multipliers affect the nutrition split, but planner yield is plate count.
    expect(getPlannerMealCountForAudience({ servings: 4 }, 2)).toBe(2);
  });

  it("returns zero when no planner audience is selected", () => {
    expect(getPlannerMealCountForAudience({ servings: 4 }, 0)).toBe(0);
  });
});

describe("markBatchSlots", () => {
  const recipe = { id: "r-1", servings: 4 } as RecipeType;
  const days = [
    new Date("2026-03-17T00:00:00.000Z"),
    new Date("2026-03-18T00:00:00.000Z"),
    new Date("2026-03-19T00:00:00.000Z"),
  ];

  it("carries source-slot audience to batch-filled slots", () => {
    const batchFilledSlots = new Map<string, RecipeType>();
    const batchSlotAudience = new Map<string, string[]>();
    const sourceAudience = ["fm-1", "fm-2"];

    markBatchSlots(
      recipe,
      PlannerMealType.DINNER,
      0,
      days,
      batchFilledSlots,
      batchSlotAudience,
      sourceAudience,
      sourceAudience.length,
    );

    const nextKey = `${days[1]!.toISOString()}-${PlannerMealType.DINNER}`;
    expect(batchFilledSlots.get(nextKey)).toBe(recipe);
    expect(batchSlotAudience.get(nextKey)).toEqual(sourceAudience);
  });
});

describe("getOrderedPlanSlots", () => {
  it("sorts slots by date first and then breakfast/lunch/dinner order", () => {
    const plan = [
      { date: new Date("2026-03-18T00:00:00.000Z"), mealType: PlannerMealType.DINNER },
      { date: new Date("2026-03-17T00:00:00.000Z"), mealType: PlannerMealType.LUNCH },
      { date: new Date("2026-03-17T00:00:00.000Z"), mealType: PlannerMealType.BREAKFAST },
    ] as any;

    const ordered = getOrderedPlanSlots(plan);
    expect(ordered.map((slot) => `${slot.date.toISOString().slice(0, 10)}-${slot.mealType}`)).toEqual([
      "2026-03-17-BREAKFAST",
      "2026-03-17-LUNCH",
      "2026-03-18-DINNER",
    ]);
  });
});
