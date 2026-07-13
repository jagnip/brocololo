import { describe, expect, it } from "vitest";
import type { PlanInputType } from "@/types/planner";
import { PlannerMealType } from "@/src/generated/enums";
import { rebasePlanWithMealRescue } from "./plan-range-rescue";

function mkRecipe(id: string) {
  return { id, name: id } as PlanInputType[number]["recipe"];
}

function mkSlot(
  dateKey: string,
  mealType: PlannerMealType,
  recipeId: string | null,
) {
  return {
    date: new Date(`${dateKey}T00:00:00.000Z`),
    mealType,
    recipe: recipeId ? mkRecipe(recipeId) : null,
    customMeal: null,
    alternatives: [],
    used: false,
  };
}

function buildWeekPlan(
  startDateKey: string,
  endDateKey: string,
  populated: Array<{ dateKey: string; mealType: PlannerMealType; recipeId: string }>,
): PlanInputType {
  const populatedByKey = new Map(
    populated.map((entry) => [
      `${entry.dateKey}-${entry.mealType}`,
      mkSlot(entry.dateKey, entry.mealType, entry.recipeId),
    ]),
  );

  const days: string[] = [];
  const cursor = new Date(`${startDateKey}T00:00:00.000Z`);
  const end = new Date(`${endDateKey}T00:00:00.000Z`);
  while (cursor.getTime() <= end.getTime()) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const plan: PlanInputType = [];
  for (const dayKey of days) {
    for (const mealType of [
      PlannerMealType.BREAKFAST,
      PlannerMealType.LUNCH,
      PlannerMealType.DINNER,
    ]) {
      plan.push(
        populatedByKey.get(`${dayKey}-${mealType}`) ??
          mkSlot(dayKey, mealType, null),
      );
    }
  }
  return plan;
}

describe("rebasePlanWithMealRescue", () => {
  it("relocates out-of-range dinner to nearest empty dinner slot when shrinking", () => {
    const plan = buildWeekPlan("2026-03-17", "2026-03-23", [
      {
        dateKey: "2026-03-22",
        mealType: PlannerMealType.DINNER,
        recipeId: "recipe-fri",
      },
    ]);

    const result = rebasePlanWithMealRescue({
      slots: plan,
      oldStartDateKey: "2026-03-17",
      newStartDateKey: "2026-03-17",
      newEndDateKey: "2026-03-20",
    });

    expect(result.relocatedCount).toBe(1);
    expect(result.movedMeals).toHaveLength(1);
    expect(result.unallocatableMeals).toHaveLength(0);

    const rescuedDinner = result.plan.find(
      (slot) =>
        slot.mealType === PlannerMealType.DINNER &&
        slot.recipe?.id === "recipe-fri",
    );
    expect(rescuedDinner?.date.toISOString().slice(0, 10)).toBe("2026-03-20");
  });

  it("records moved meals when start shift changes the day but keeps the occasion", () => {
    const plan = buildWeekPlan("2026-03-17", "2026-03-19", [
      {
        dateKey: "2026-03-17",
        mealType: PlannerMealType.BREAKFAST,
        recipeId: "recipe-mon",
      },
    ]);

    const result = rebasePlanWithMealRescue({
      slots: plan,
      oldStartDateKey: "2026-03-17",
      newStartDateKey: "2026-03-19",
      newEndDateKey: "2026-03-19",
    });

    expect(result.relocatedCount).toBe(0);
    expect(result.movedMeals).toHaveLength(1);
    expect(result.movedMeals[0]).toMatchObject({
      mealLabel: "recipe-mon",
      fromDateKey: "2026-03-17",
      toDateKey: "2026-03-19",
      fromMealType: PlannerMealType.BREAKFAST,
      toMealType: PlannerMealType.BREAKFAST,
    });
  });

  it("keeps shifted in-range meals and reports out-of-range meals that cannot be rescued", () => {
    const plan = buildWeekPlan("2026-03-17", "2026-03-19", [
      {
        dateKey: "2026-03-17",
        mealType: PlannerMealType.BREAKFAST,
        recipeId: "recipe-mon",
      },
      {
        dateKey: "2026-03-19",
        mealType: PlannerMealType.BREAKFAST,
        recipeId: "recipe-wed",
      },
    ]);

    const result = rebasePlanWithMealRescue({
      slots: plan,
      oldStartDateKey: "2026-03-17",
      newStartDateKey: "2026-03-19",
      newEndDateKey: "2026-03-19",
    });

    expect(result.relocatedCount).toBe(0);
    expect(result.unallocatableMeals).toHaveLength(1);
    expect(result.unallocatableMeals[0]?.mealLabel).toBe("recipe-wed");

    const wedBreakfast = result.plan.find(
      (slot) =>
        slot.date.toISOString().slice(0, 10) === "2026-03-19" &&
        slot.mealType === PlannerMealType.BREAKFAST,
    );
    expect(wedBreakfast?.recipe?.id).toBe("recipe-mon");
  });

  it("reports unallocatable meals when no same-occasion empty slots remain", () => {
    const plan = buildWeekPlan("2026-03-17", "2026-03-19", [
      {
        dateKey: "2026-03-17",
        mealType: PlannerMealType.BREAKFAST,
        recipeId: "recipe-a",
      },
      {
        dateKey: "2026-03-18",
        mealType: PlannerMealType.BREAKFAST,
        recipeId: "recipe-b",
      },
      {
        dateKey: "2026-03-19",
        mealType: PlannerMealType.BREAKFAST,
        recipeId: "recipe-c",
      },
    ]);

    const result = rebasePlanWithMealRescue({
      slots: plan,
      oldStartDateKey: "2026-03-17",
      newStartDateKey: "2026-03-17",
      newEndDateKey: "2026-03-18",
    });

    expect(result.relocatedCount).toBe(0);
    expect(result.unallocatableMeals).toHaveLength(1);
    expect(result.unallocatableMeals[0]?.mealLabel).toBe("recipe-c");
    expect(
      result.plan.some((slot) => slot.recipe?.id === "recipe-c"),
    ).toBe(false);
  });

  it("allocates orphans deterministically when multiple compete for limited empty slots", () => {
    const plan = buildWeekPlan("2026-03-17", "2026-03-20", [
      {
        dateKey: "2026-03-19",
        mealType: PlannerMealType.LUNCH,
        recipeId: "recipe-older",
      },
      {
        dateKey: "2026-03-20",
        mealType: PlannerMealType.LUNCH,
        recipeId: "recipe-newer",
      },
    ]);

    const result = rebasePlanWithMealRescue({
      slots: plan,
      oldStartDateKey: "2026-03-17",
      newStartDateKey: "2026-03-17",
      newEndDateKey: "2026-03-17",
    });

    expect(result.relocatedCount).toBe(1);
    expect(result.unallocatableMeals).toHaveLength(1);
    expect(result.unallocatableMeals[0]?.mealLabel).toBe("recipe-newer");

    const rescuedLunch = result.plan.find(
      (slot) =>
        slot.mealType === PlannerMealType.LUNCH &&
        slot.recipe?.id === "recipe-older",
    );
    expect(rescuedLunch?.date.toISOString().slice(0, 10)).toBe("2026-03-17");
  });

  it("returns an empty scaffold without rescue metadata when no populated meals exist", () => {
    const plan = buildWeekPlan("2026-03-17", "2026-03-23", []);

    const result = rebasePlanWithMealRescue({
      slots: plan,
      oldStartDateKey: "2026-03-17",
      newStartDateKey: "2026-03-17",
      newEndDateKey: "2026-03-20",
    });

    expect(result.plan).toHaveLength(4 * 3);
    expect(result.relocatedCount).toBe(0);
    expect(result.unallocatableMeals).toHaveLength(0);
    expect(result.plan.every((slot) => !slot.recipe && !slot.customMeal)).toBe(
      true,
    );
  });
});
