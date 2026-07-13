import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultDateRange } from "./date-range-picker";

describe("getDefaultDateRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-07T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to one week from today when no dates are occupied", () => {
    const range = getDefaultDateRange([]);
    expect(range).toEqual({
      start: "2026-07-07",
      end: "2026-07-13",
    });
  });

  it("finds the next available free 7-day window", () => {
    const range = getDefaultDateRange([
      "2026-07-07",
      "2026-07-08",
      "2026-07-09",
      "2026-07-10",
      "2026-07-11",
      "2026-07-12",
      "2026-07-13",
      "2026-07-14",
    ]);
    expect(range).toEqual({
      start: "2026-07-15",
      end: "2026-07-21",
    });
  });
});
