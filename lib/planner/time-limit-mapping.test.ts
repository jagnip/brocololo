import { describe, expect, it } from "vitest";
import {
  WEEKDAY_TIME_LIMIT_DEFAULTS,
  WEEKEND_TIME_LIMIT_DEFAULTS,
} from "@/lib/constants";
import {
  getRangeGroupAvailability,
  mapGroupLimitsToDailyLimits,
  mergeDailyLimitsByDate,
} from "./time-limit-mapping";

describe("time-limit-mapping", () => {
  it("detects weekday-only ranges", () => {
    const days = [new Date("2026-03-02"), new Date("2026-03-03")]; // Mon, Tue
    expect(getRangeGroupAvailability(days)).toEqual({
      hasWeekdays: true,
      hasWeekend: false,
    });
  });

  it("detects weekend-only ranges", () => {
    const days = [new Date("2026-03-07"), new Date("2026-03-08")]; // Sat, Sun
    expect(getRangeGroupAvailability(days)).toEqual({
      hasWeekdays: false,
      hasWeekend: true,
    });
  });

  it("maps grouped defaults to concrete days", () => {
    const days = [
      new Date("2026-03-06"), // Friday
      new Date("2026-03-07"), // Saturday
    ];
    const mapped = mapGroupLimitsToDailyLimits(days, {
      weekday: WEEKDAY_TIME_LIMIT_DEFAULTS,
      weekend: WEEKEND_TIME_LIMIT_DEFAULTS,
    });

    // Friday uses weekday group; Saturday uses weekend group.
    expect(mapped[0]).toMatchObject({
      date: "2026-03-06",
      breakfastHandsOnMax: 15,
      lunchHandsOnMax: 20,
      dinnerHandsOnMax: 25,
      breakfastTotalMax: null,
      lunchTotalMax: 30,
      dinnerTotalMax: 30,
    });
    expect(mapped[1]).toMatchObject({
      date: "2026-03-07",
      breakfastHandsOnMax: 30,
      lunchHandsOnMax: 30,
      dinnerHandsOnMax: 40,
      breakfastTotalMax: null,
      lunchTotalMax: 30,
      dinnerTotalMax: null,
    });
  });

  it("preserves existing daily edits when range changes", () => {
    const nextRange = [
      new Date("2026-03-02"), // existing
      new Date("2026-03-03"), // existing
      new Date("2026-03-04"), // new date
    ];

    const merged = mergeDailyLimitsByDate(
      nextRange,
      [
        {
          date: "2026-03-02",
          breakfastHandsOnMax: 99,
          lunchHandsOnMax: 20,
          dinnerHandsOnMax: 25,
          breakfastTotalMax: null,
          lunchTotalMax: 30,
          dinnerTotalMax: 30,
        },
        {
          date: "2026-03-03",
          breakfastHandsOnMax: 15,
          lunchHandsOnMax: 88,
          dinnerHandsOnMax: 25,
          breakfastTotalMax: null,
          lunchTotalMax: 30,
          dinnerTotalMax: 30,
        },
      ],
      {
        weekday: WEEKDAY_TIME_LIMIT_DEFAULTS,
        weekend: WEEKEND_TIME_LIMIT_DEFAULTS,
      },
    );

    // Existing days keep edits.
    expect(merged[0].breakfastHandsOnMax).toBe(99);
    expect(merged[1].lunchHandsOnMax).toBe(88);
    // New day is initialized from weekday defaults.
    expect(merged[2]).toMatchObject({
      date: "2026-03-04",
      breakfastHandsOnMax: 15,
      lunchHandsOnMax: 20,
      dinnerHandsOnMax: 25,
      breakfastTotalMax: null,
      lunchTotalMax: 30,
      dinnerTotalMax: 30,
    });
  });
});
