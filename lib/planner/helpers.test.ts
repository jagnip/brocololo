import { describe, expect, it } from "vitest";
import { PlannerMealType } from "@/src/generated/enums";
import {
  getBatchGroupLabels,
  getOrderedPlanSlots,
  getPlannerMealCount,
  markBatchSlots,
  placeRecipeOnPlan,
} from "@/lib/planner/helpers";
import type { RecipeType } from "@/types/recipe";
import type { PlanInputType } from "@/types/planner";
import type { DayTimeLimitsType } from "@/lib/validations/planner";

describe("getPlannerMealCount", () => {
  it("returns the recipe's explicit plannedMealCount", () => {
    expect(getPlannerMealCount({ plannedMealCount: 3 })).toBe(3);
  });

  it("never returns less than 1", () => {
    expect(getPlannerMealCount({ plannedMealCount: 0 })).toBe(1);
  });
});

describe("markBatchSlots", () => {
  const days = [
    new Date("2026-03-17T00:00:00.000Z"),
    new Date("2026-03-18T00:00:00.000Z"),
    new Date("2026-03-19T00:00:00.000Z"),
  ];

  it("carries source-slot audience and batchGroupId to filled slots", () => {
    const recipe = {
      id: "r-1",
      plannedMealCount: 3,
      isBatchRecipe: true,
      handsOnTime: 30,
      totalTime: 45,
    } as RecipeType;
    const batchFilledSlots = new Map<string, RecipeType>();
    const batchSlotAudience = new Map<string, string[]>();
    const batchSlotGroupIds = new Map<string, string>();
    const sourceAudience = ["fm-1", "fm-2"];
    const groupId = "group-1";

    markBatchSlots(
      recipe,
      PlannerMealType.DINNER,
      0,
      days,
      batchFilledSlots,
      batchSlotAudience,
      batchSlotGroupIds,
      sourceAudience,
      groupId,
    );

    const day2Key = `${days[1]!.toISOString()}-${PlannerMealType.DINNER}`;
    const day3Key = `${days[2]!.toISOString()}-${PlannerMealType.DINNER}`;
    expect(batchFilledSlots.get(day2Key)).toBe(recipe);
    expect(batchSlotAudience.get(day2Key)).toEqual(sourceAudience);
    expect(batchSlotGroupIds.get(day2Key)).toBe(groupId);
    expect(batchFilledSlots.get(day3Key)).toBe(recipe);
    expect(batchSlotGroupIds.get(day3Key)).toBe(groupId);
  });

  it("places batch leftovers even when the day fails time limits", () => {
    const recipe = {
      id: "r-batch",
      plannedMealCount: 2,
      isBatchRecipe: true,
      handsOnTime: 60,
      totalTime: 90,
    } as RecipeType;
    const batchFilledSlots = new Map<string, RecipeType>();
    const batchSlotAudience = new Map<string, string[]>();
    const batchSlotGroupIds = new Map<string, string>();
    const tightLimits: DayTimeLimitsType[] = [
      {
        date: "2026-03-18",
        breakfastHandsOnMax: null,
        lunchHandsOnMax: null,
        dinnerHandsOnMax: 20,
        breakfastTotalMax: null,
        lunchTotalMax: null,
        dinnerTotalMax: 30,
      },
    ];

    markBatchSlots(
      recipe,
      PlannerMealType.DINNER,
      0,
      days,
      batchFilledSlots,
      batchSlotAudience,
      batchSlotGroupIds,
      ["fm-1"],
      "group-batch",
      {
        enforceTimeLimit: false,
        allDaysTimeLimits: tightLimits,
      },
    );

    const day2Key = `${days[1]!.toISOString()}-${PlannerMealType.DINNER}`;
    expect(batchFilledSlots.has(day2Key)).toBe(true);
  });

  it("skips days that fail time limits for non-batch repeats", () => {
    const recipe = {
      id: "r-repeat",
      plannedMealCount: 2,
      isBatchRecipe: false,
      handsOnTime: 60,
      totalTime: 90,
    } as RecipeType;
    const batchFilledSlots = new Map<string, RecipeType>();
    const batchSlotAudience = new Map<string, string[]>();
    const batchSlotGroupIds = new Map<string, string>();
    const limits: DayTimeLimitsType[] = [
      {
        date: "2026-03-18",
        breakfastHandsOnMax: null,
        lunchHandsOnMax: null,
        dinnerHandsOnMax: 20,
        breakfastTotalMax: null,
        lunchTotalMax: null,
        dinnerTotalMax: 30,
      },
      {
        date: "2026-03-19",
        breakfastHandsOnMax: null,
        lunchHandsOnMax: null,
        dinnerHandsOnMax: 90,
        breakfastTotalMax: null,
        lunchTotalMax: null,
        dinnerTotalMax: 120,
      },
    ];

    markBatchSlots(
      recipe,
      PlannerMealType.DINNER,
      0,
      days,
      batchFilledSlots,
      batchSlotAudience,
      batchSlotGroupIds,
      ["fm-1"],
      "group-repeat",
      {
        enforceTimeLimit: true,
        allDaysTimeLimits: limits,
      },
    );

    const day2Key = `${days[1]!.toISOString()}-${PlannerMealType.DINNER}`;
    const day3Key = `${days[2]!.toISOString()}-${PlannerMealType.DINNER}`;
    // Day 2 is too tight — skip ahead to day 3.
    expect(batchFilledSlots.has(day2Key)).toBe(false);
    expect(batchFilledSlots.has(day3Key)).toBe(true);
  });

  it("places fewer than requested when no remaining day fits a non-batch repeat", () => {
    const recipe = {
      id: "r-repeat",
      plannedMealCount: 3,
      isBatchRecipe: false,
      handsOnTime: 60,
      totalTime: 90,
    } as RecipeType;
    const batchFilledSlots = new Map<string, RecipeType>();
    const batchSlotAudience = new Map<string, string[]>();
    const batchSlotGroupIds = new Map<string, string>();
    const tightEverywhere: DayTimeLimitsType[] = days.map((day) => ({
      date: day.toISOString().slice(0, 10),
      breakfastHandsOnMax: null,
      lunchHandsOnMax: null,
      dinnerHandsOnMax: 10,
      breakfastTotalMax: null,
      lunchTotalMax: null,
      dinnerTotalMax: 15,
    }));

    markBatchSlots(
      recipe,
      PlannerMealType.DINNER,
      0,
      days,
      batchFilledSlots,
      batchSlotAudience,
      batchSlotGroupIds,
      ["fm-1"],
      "group-underfill",
      {
        enforceTimeLimit: true,
        allDaysTimeLimits: tightEverywhere,
      },
    );

    expect(batchFilledSlots.size).toBe(0);
  });
});

describe("getBatchGroupLabels", () => {
  it("labels members of groups with 2+ slots as 1-based N of M", () => {
    const recipe = {
      id: "r-1",
      isBatchRecipe: true,
      name: "Bolognese",
    } as RecipeType;
    const plan: PlanInputType = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        mealType: PlannerMealType.DINNER,
        recipe,
        customMeal: null,
        alternatives: [],
        used: false,
        batchGroupId: "g1",
      },
      {
        date: new Date("2026-03-18T00:00:00.000Z"),
        mealType: PlannerMealType.DINNER,
        recipe,
        customMeal: null,
        alternatives: [],
        used: false,
        batchGroupId: "g1",
      },
    ];

    const labels = getBatchGroupLabels(plan);
    expect(labels.size).toBe(2);
    const day1Key = `${plan[0]!.date.toISOString()}-${PlannerMealType.DINNER}`;
    const day2Key = `${plan[1]!.date.toISOString()}-${PlannerMealType.DINNER}`;
    expect(labels.get(day1Key)).toEqual({ index: 1, total: 2 });
    expect(labels.get(day2Key)).toEqual({ index: 2, total: 2 });
  });

  it("skips groups with a single remaining member", () => {
    const recipe = { id: "r-1", isBatchRecipe: true } as RecipeType;
    const plan: PlanInputType = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        mealType: PlannerMealType.DINNER,
        recipe,
        customMeal: null,
        alternatives: [],
        used: false,
        batchGroupId: "g1",
      },
    ];

    expect(getBatchGroupLabels(plan).size).toBe(0);
  });
});

describe("placeRecipeOnPlan", () => {
  function emptyDinner(dateIso: string) {
    return {
      date: new Date(dateIso),
      mealType: PlannerMealType.DINNER,
      recipe: null,
      customMeal: null,
      alternatives: [],
      used: false,
      cookingFamilyMemberIds: ["m1"],
      batchGroupId: null,
    };
  }

  it("fills following empty same-meal slots and shares a batchGroupId", () => {
    const recipe = {
      id: "r-batch",
      plannedMealCount: 3,
      isBatchRecipe: true,
    } as RecipeType;

    const plan: PlanInputType = [
      emptyDinner("2026-03-17T00:00:00.000Z"),
      emptyDinner("2026-03-18T00:00:00.000Z"),
      emptyDinner("2026-03-19T00:00:00.000Z"),
    ];

    const slotKey = `${plan[0]!.date.toISOString()}-${PlannerMealType.DINNER}`;
    const next = placeRecipeOnPlan(plan, slotKey, recipe);

    expect(next.every((slot) => slot.recipe?.id === "r-batch")).toBe(true);
    const groupIds = next.map((slot) => slot.batchGroupId);
    expect(groupIds[0]).toBeTruthy();
    expect(groupIds[0]).toBe(groupIds[1]);
    expect(groupIds[0]).toBe(groupIds[2]);
    expect(getBatchGroupLabels(next).size).toBe(3);
  });

  it("skips occupied following slots while still filling later empty ones", () => {
    const recipe = {
      id: "r-batch",
      plannedMealCount: 3,
      isBatchRecipe: true,
    } as RecipeType;
    const other = { id: "r-other" } as RecipeType;

    const plan: PlanInputType = [
      emptyDinner("2026-03-17T00:00:00.000Z"),
      {
        ...emptyDinner("2026-03-18T00:00:00.000Z"),
        recipe: other,
      },
      emptyDinner("2026-03-19T00:00:00.000Z"),
      emptyDinner("2026-03-20T00:00:00.000Z"),
    ];

    const slotKey = `${plan[0]!.date.toISOString()}-${PlannerMealType.DINNER}`;
    const next = placeRecipeOnPlan(plan, slotKey, recipe);

    expect(next[0]!.recipe?.id).toBe("r-batch");
    expect(next[1]!.recipe?.id).toBe("r-other");
    expect(next[2]!.recipe?.id).toBe("r-batch");
    expect(next[3]!.recipe?.id).toBe("r-batch");
    expect(next[0]!.batchGroupId).toBe(next[2]!.batchGroupId);
    expect(next[0]!.batchGroupId).toBe(next[3]!.batchGroupId);
    expect(next[1]!.batchGroupId).toBeNull();
  });

  it("does not create a group for single-meal recipes", () => {
    const recipe = {
      id: "r-1",
      plannedMealCount: 1,
      isBatchRecipe: false,
    } as RecipeType;

    const plan: PlanInputType = [
      emptyDinner("2026-03-17T00:00:00.000Z"),
      emptyDinner("2026-03-18T00:00:00.000Z"),
    ];

    const slotKey = `${plan[0]!.date.toISOString()}-${PlannerMealType.DINNER}`;
    const next = placeRecipeOnPlan(plan, slotKey, recipe);

    expect(next[0]!.recipe?.id).toBe("r-1");
    expect(next[0]!.batchGroupId).toBeNull();
    expect(next[1]!.recipe).toBeNull();
  });

  it("joins an existing same-recipe batch group instead of starting a new one", () => {
    const recipe = {
      id: "r-caprese",
      plannedMealCount: 2,
      isBatchRecipe: true,
    } as RecipeType;

    const plan: PlanInputType = [
      {
        ...emptyDinner("2026-03-17T00:00:00.000Z"),
        recipe,
        batchGroupId: "existing-group",
      },
      {
        ...emptyDinner("2026-03-18T00:00:00.000Z"),
        recipe,
        batchGroupId: "existing-group",
      },
      emptyDinner("2026-03-19T00:00:00.000Z"),
    ];

    const slotKey = `${plan[2]!.date.toISOString()}-${PlannerMealType.DINNER}`;
    const next = placeRecipeOnPlan(plan, slotKey, recipe);

    expect(next[2]!.recipe?.id).toBe("r-caprese");
    expect(next[2]!.batchGroupId).toBe("existing-group");
    // Joining must not spill into further empty days.
    expect(next.filter((slot) => slot.batchGroupId === "existing-group")).toHaveLength(
      3,
    );
    expect(getBatchGroupLabels(next).get(slotKey)).toEqual({
      index: 3,
      total: 3,
    });
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
