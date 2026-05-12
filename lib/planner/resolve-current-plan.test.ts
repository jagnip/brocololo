import { describe, expect, it } from "vitest";
import {
  isWithinDateRange,
  resolveCurrentPlanFromList,
  toDateKey,
} from "@/lib/planner/resolve-current-plan";

describe("resolveCurrentPlanFromList", () => {
  const older = {
    id: "older",
    startDate: new Date("2026-01-01T00:00:00.000Z"),
    endDate: new Date("2026-01-07T23:59:59.999Z"),
  };
  const newer = {
    id: "newer",
    startDate: new Date("2026-01-08T00:00:00.000Z"),
    endDate: new Date("2026-01-14T23:59:59.999Z"),
  };

  it("returns null for an empty list", () => {
    expect(resolveCurrentPlanFromList([], new Date("2026-01-05T12:00:00.000Z"))).toBeNull();
  });

  it("prefers the plan whose range contains today (first matching row order)", () => {
    const plans = [newer, older];
    const today = new Date("2026-01-05T12:00:00.000Z");
    expect(resolveCurrentPlanFromList(plans, today)?.id).toBe("older");
  });

  it("when today is in multiple ranges, returns the first match in array order", () => {
    const a = {
      id: "a",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-01-31T23:59:59.999Z"),
    };
    const b = {
      id: "b",
      startDate: new Date("2026-01-10T00:00:00.000Z"),
      endDate: new Date("2026-01-20T23:59:59.999Z"),
    };
    const today = new Date("2026-01-15T12:00:00.000Z");
    expect(resolveCurrentPlanFromList([a, b], today)?.id).toBe("a");
  });

  it("falls back to plans[0] when today is outside all ranges", () => {
    const plans = [newer, older];
    const today = new Date("2026-02-01T12:00:00.000Z");
    expect(resolveCurrentPlanFromList(plans, today)?.id).toBe("newer");
  });
});

describe("isWithinDateRange / toDateKey", () => {
  it("includes boundary days using UTC date keys", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const end = new Date("2026-01-07T00:00:00.000Z");
    expect(toDateKey(new Date("2026-01-01T12:00:00.000Z"))).toBe("2026-01-01");
    expect(isWithinDateRange(new Date("2026-01-01T12:00:00.000Z"), start, end)).toBe(true);
    expect(isWithinDateRange(new Date("2026-01-07T12:00:00.000Z"), start, end)).toBe(true);
    expect(isWithinDateRange(new Date("2025-12-31T12:00:00.000Z"), start, end)).toBe(false);
  });
});
