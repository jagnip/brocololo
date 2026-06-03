import { describe, expect, it } from "vitest";
import { getDailyLimitsForPlanAllDaysToggle } from "./planner-form";
import {
  getPlannerPlanColumnMode,
  shouldShowGeneratedPlan,
} from "./planner-plan-column-state";
import { MESSAGES } from "@/lib/messages";
import {
  WEEKDAY_TIME_LIMIT_DEFAULTS,
  WEEKEND_TIME_LIMIT_DEFAULTS,
} from "@/lib/constants";
import type { PlanInputType } from "@/types/planner";

describe("planner-form visibility helpers", () => {
  it("hides generated plan while generation is in progress", () => {
    const plan: PlanInputType = [
      {
        date: new Date("2026-03-02"),
        mealType: "DINNER",
        recipe: null,
        alternatives: [],
        used: false,
      },
    ];

    expect(shouldShowGeneratedPlan(plan, true)).toBe(false);
  });

  it("hides generated plan when no plan exists yet", () => {
    expect(shouldShowGeneratedPlan(null, false)).toBe(false);
  });

  it("shows generated plan only when generation finished with results", () => {
    const plan: PlanInputType = [
      {
        date: new Date("2026-03-02"),
        mealType: "DINNER",
        recipe: null,
        alternatives: [],
        used: false,
      },
    ];

    expect(shouldShowGeneratedPlan(plan, false)).toBe(true);
  });

  it("shows failure empty state after Find meals errors, hiding the previous plan", () => {
    const plan: PlanInputType = [
      {
        date: new Date("2026-03-02"),
        mealType: "DINNER",
        recipe: null,
        alternatives: [],
        used: false,
      },
    ];

    expect(
      getPlannerPlanColumnMode({
        isGenerating: false,
        plan: null,
        lastGenerationError: MESSAGES.planner.generationFailedTitle,
      }),
    ).toBe("failure");
    expect(
      getPlannerPlanColumnMode({
        isGenerating: false,
        plan,
        lastGenerationError: MESSAGES.planner.generationFailedTitle,
      }),
    ).toBe("failure");
  });

  it("shows the previous plan again when not generating and no error is set", () => {
    const plan: PlanInputType = [
      {
        date: new Date("2026-03-02"),
        mealType: "DINNER",
        recipe: null,
        alternatives: [],
        used: false,
      },
    ];

    expect(
      getPlannerPlanColumnMode({
        isGenerating: false,
        plan,
        lastGenerationError: null,
      }),
    ).toBe("plan");
  });

  it("shows idle empty when nothing was generated and no error is set", () => {
    expect(
      getPlannerPlanColumnMode({
        isGenerating: false,
        plan: null,
        lastGenerationError: null,
      }),
    ).toBe("idle");
  });

  it("shows plan column content when generation succeeds", () => {
    const plan: PlanInputType = [
      {
        date: new Date("2026-03-02"),
        mealType: "DINNER",
        recipe: null,
        alternatives: [],
        used: false,
      },
    ];

    expect(
      getPlannerPlanColumnMode({
        isGenerating: false,
        plan,
        lastGenerationError: null,
      }),
    ).toBe("plan");
  });

  it("seeds daily limits from grouped values when no daily draft exists", () => {
    const days = [new Date("2026-03-06"), new Date("2026-03-07")]; // Fri, Sat
    const nextDaily = getDailyLimitsForPlanAllDaysToggle(
      days,
      null,
      {
        weekday: WEEKDAY_TIME_LIMIT_DEFAULTS,
        weekend: WEEKEND_TIME_LIMIT_DEFAULTS,
      },
    );

    expect(nextDaily[0]).toMatchObject({
      date: "2026-03-06",
      breakfastHandsOnMax: 30,
      lunchHandsOnMax: 30,
      dinnerHandsOnMax: 30,
    });
    expect(nextDaily[1]).toMatchObject({
      date: "2026-03-07",
      breakfastHandsOnMax: 30,
      lunchHandsOnMax: 30,
      dinnerHandsOnMax: 40,
    });
  });

  it("preserves existing daily draft when toggling back to plan all days", () => {
    const days = [new Date("2026-03-06"), new Date("2026-03-07")];
    const dailyDraft = [
      {
        date: "2026-03-06",
        breakfastHandsOnMax: 77,
        lunchHandsOnMax: 20,
        dinnerHandsOnMax: 25,
        breakfastTotalMax: null,
        lunchTotalMax: 30,
        dinnerTotalMax: 30,
      },
      {
        date: "2026-03-07",
        breakfastHandsOnMax: 30,
        lunchHandsOnMax: 88,
        dinnerHandsOnMax: 40,
        breakfastTotalMax: null,
        lunchTotalMax: 30,
        dinnerTotalMax: null,
      },
    ];

    const nextDaily = getDailyLimitsForPlanAllDaysToggle(
      days,
      dailyDraft,
      {
        weekday: WEEKDAY_TIME_LIMIT_DEFAULTS,
        weekend: WEEKEND_TIME_LIMIT_DEFAULTS,
      },
    );

    expect(nextDaily[0].breakfastHandsOnMax).toBe(77);
    expect(nextDaily[1].lunchHandsOnMax).toBe(88);
  });
});
