import { describe, expect, it } from "vitest";
import { LogMealType } from "@/src/generated/enums";
import type { LogDayData, LogSlotData } from "@/lib/log/view-model";
import {
  getLogDayStatistics,
  getLogPeriodStatistics,
} from "./statistics";

function makeSlots(
  macros?: Partial<{
    calories: number;
    proteins: number;
    fats: number;
    carbs: number;
  }>,
): LogSlotData[] {
  return [
    {
      mealType: LogMealType.BREAKFAST,
      label: "Breakfast",
      recipes: macros
        ? [
            {
              id: "recipe-1",
              entryRecipeId: "recipe-1",
              sourceRecipeId: "source-1",
              mealLabel: "Breakfast",
              cardKind: "recipe",
              title: "Breakfast",
              slug: "breakfast",
              imageUrl: null,
              calories: macros.calories ?? 0,
              proteins: macros.proteins ?? 0,
              fats: macros.fats ?? 0,
              carbs: macros.carbs ?? 0,
            },
          ]
        : [],
    },
    { mealType: LogMealType.LUNCH, label: "Lunch", recipes: [] },
    { mealType: LogMealType.SNACK, label: "Snack", recipes: [] },
    { mealType: LogMealType.DINNER, label: "Dinner", recipes: [] },
  ];
}

function makeDay(dateKey: string, macros?: Parameters<typeof makeSlots>[0]): LogDayData {
  return {
    date: new Date(`${dateKey}T00:00:00.000Z`),
    dateKey,
    slots: makeSlots(macros),
  };
}

describe("log statistics", () => {
  it("sums every meal in a day", () => {
    const day = makeDay("2026-03-17", {
      calories: 350.25,
      proteins: 12.34,
      fats: 7.05,
      carbs: 60.04,
    });
    day.slots[1]!.recipes.push({
      ...day.slots[0]!.recipes[0]!,
      id: "recipe-2",
      entryRecipeId: "recipe-2",
      calories: 500.25,
      proteins: 40.04,
      fats: 18.06,
      carbs: 30.06,
    });

    expect(getLogDayStatistics(day)).toMatchObject({
      hasEntries: true,
      calories: 850.5,
      proteins: 52.4,
      fats: 25.1,
      carbs: 90.1,
    });
  });

  it("averages only days containing log entries while retaining empty plan days", () => {
    const summary = getLogPeriodStatistics([
      makeDay("2026-03-17", {
        calories: 1800,
        proteins: 100,
        fats: 60,
        carbs: 220,
      }),
      makeDay("2026-03-18"),
      makeDay("2026-03-19", {
        calories: 2000,
        proteins: 120,
        fats: 70,
        carbs: 240,
      }),
    ]);

    expect(summary).toMatchObject({
      loggedDayCount: 2,
      planDayCount: 3,
      totals: {
        calories: 3800,
        proteins: 220,
        fats: 130,
        carbs: 460,
      },
      dailyAverages: {
        calories: 1900,
        proteins: 110,
        fats: 65,
        carbs: 230,
      },
    });
    expect(summary.days[1]).toMatchObject({
      hasEntries: false,
      calories: 0,
    });
  });

  it("returns zero averages when the period has no entries", () => {
    const summary = getLogPeriodStatistics([makeDay("2026-03-17")]);

    expect(summary.loggedDayCount).toBe(0);
    expect(summary.dailyAverages).toEqual({
      calories: 0,
      proteins: 0,
      fats: 0,
      carbs: 0,
    });
  });
});
