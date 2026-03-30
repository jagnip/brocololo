import { describe, expect, it } from "vitest";
import type { PlanInputType } from "@/types/planner";
import { PlannerMealType } from "@/src/generated/enums";
import { rebasePlanSlotsByDateRangeDelta } from "./plan-date-rebase";
import { MEAL_TYPES } from "@/lib/constants";

function mkRecipe(id: string) {
  return { id } as any;
}

function mkSlot(dateKey: string, mealType: PlannerMealType, recipeId: string | null) {
  return {
    date: new Date(`${dateKey}T00:00:00.000Z`),
    mealType,
    recipe: recipeId ? mkRecipe(recipeId) : null,
    alternatives: recipeId ? [mkRecipe(`${recipeId}-alt`)] : [],
    used: false,
  };
}

describe("plan-date-rebase", () => {
  it("shifts slots by delta and creates empty slots for new days", () => {
    const oldStart = "2026-04-09";
    const oldEnd = "2026-04-12";

    const oldSlots: PlanInputType = [];
    const daysOld = ["2026-04-09", "2026-04-10", "2026-04-11", "2026-04-12"];
    for (const d of daysOld) {
      for (const mealType of MEAL_TYPES) {
        oldSlots.push(mkSlot(d, mealType, `${d}-${mealType}`));
      }
    }

    void oldEnd;

    const next = rebasePlanSlotsByDateRangeDelta({
      slots: oldSlots,
      oldStartDateKey: oldStart,
      newStartDateKey: "2026-04-10",
      newEndDateKey: "2026-04-15",
    });

    expect(next).toHaveLength(6 * 3);

    const day = "2026-04-10";
    const breakfastSlot = next.find(
      (s) => s.date.toISOString().slice(0, 10) === day && s.mealType === PlannerMealType.BREAKFAST,
    );
    expect(breakfastSlot?.recipe?.id).toBe(`2026-04-09-${PlannerMealType.BREAKFAST}`);

    const emptyDay = "2026-04-14";
    const lunchSlotEmpty = next.find(
      (s) => s.date.toISOString().slice(0, 10) === emptyDay && s.mealType === PlannerMealType.LUNCH,
    );
    expect(lunchSlotEmpty?.recipe).toBeNull();
    expect(lunchSlotEmpty?.alternatives).toEqual([]);
  });

  it("drops slots that shift outside the new end by creating empties for remaining days", () => {
    const oldSlots: PlanInputType = [];
    const daysOld = ["2026-04-09", "2026-04-10", "2026-04-11", "2026-04-12"];
    for (const d of daysOld) {
      for (const mealType of MEAL_TYPES) {
        oldSlots.push(mkSlot(d, mealType, `${d}-${mealType}`));
      }
    }

    const next = rebasePlanSlotsByDateRangeDelta({
      slots: oldSlots,
      oldStartDateKey: "2026-04-09",
      newStartDateKey: "2026-04-11",
      newEndDateKey: "2026-04-12",
    });

    expect(next).toHaveLength(2 * 3);

    const slot = next.find(
      (s) =>
        s.date.toISOString().slice(0, 10) === "2026-04-11" &&
        s.mealType === PlannerMealType.BREAKFAST,
    );
    expect(slot?.recipe?.id).toBe(`2026-04-09-${PlannerMealType.BREAKFAST}`);
  });
});

