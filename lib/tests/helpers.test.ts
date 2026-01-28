import { describe, it, expect } from "vitest";
import { getMealTimeLimit } from "../planner/helpers";
import type { DayTimeLimitsType } from "../validations/planner";

const dayLimits: DayTimeLimitsType = {
  date: "21/02/2026",
  breakfastHandsOnMax: 15,
  lunchHandsOnMax: 20,
  dinnerHandsOnMax: 25,
  breakfastTotalMax: null,
  lunchTotalMax: 30,
  dinnerTotalMax: 60,
};

// ============================================================================
// getMealTimeLimit — handsOn
// ============================================================================

describe("getMealTimeLimit (handsOn)", () => {
  it("returns breakfastHandsOnMax for BREAKFAST", () => {
    expect(getMealTimeLimit(dayLimits, "BREAKFAST", "handsOn")).toBe(15);
  });

  it("returns lunchHandsOnMax for LUNCH", () => {
    expect(getMealTimeLimit(dayLimits, "LUNCH", "handsOn")).toBe(20);
  });

  it("returns dinnerHandsOnMax for DINNER", () => {
    expect(getMealTimeLimit(dayLimits, "DINNER", "handsOn")).toBe(25);
  });

  it("returns null when dayLimits is undefined", () => {
    expect(getMealTimeLimit(undefined, "DINNER", "handsOn")).toBeNull();
  });
});

// ============================================================================
// getMealTimeLimit — total
// ============================================================================

describe("getMealTimeLimit (total)", () => {
  it("returns breakfastTotalMax for BREAKFAST", () => {
    expect(getMealTimeLimit(dayLimits, "BREAKFAST", "total")).toBeNull();
  });

  it("returns lunchTotalMax for LUNCH", () => {
    expect(getMealTimeLimit(dayLimits, "LUNCH", "total")).toBe(30);
  });

  it("returns dinnerTotalMax for DINNER", () => {
    expect(getMealTimeLimit(dayLimits, "DINNER", "total")).toBe(60);
  });

  it("returns null when dayLimits is undefined", () => {
    expect(getMealTimeLimit(undefined, "LUNCH", "total")).toBeNull();
  });
});

// ============================================================================
// getMealTimeLimit — all null limits
// ============================================================================

describe("getMealTimeLimit (all nulls)", () => {
  const allNull: DayTimeLimitsType = {
    date: "21/02/2026",
    breakfastHandsOnMax: null,
    lunchHandsOnMax: null,
    dinnerHandsOnMax: null,
    breakfastTotalMax: null,
    lunchTotalMax: null,
    dinnerTotalMax: null,
  };

  it("returns null for every combination when all limits are null", () => {
    for (const meal of ["BREAKFAST", "LUNCH", "DINNER"] as const) {
      for (const type of ["handsOn", "total"] as const) {
        expect(getMealTimeLimit(allNull, meal, type)).toBeNull();
      }
    }
  });
});
