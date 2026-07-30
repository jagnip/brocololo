import { describe, expect, it } from "vitest";
import {
  decodePlanCookParam,
  encodePlanCookParam,
  formatPlanCookSessionBanner,
  formatPlanCookSessionDates,
} from "@/lib/recipes/plan-cook-session-link";
import type { CookingCombination } from "@/lib/recipes/cook-session-portions";

const J = "member-jagoda";
const N = "member-nelson";
const HOUSEHOLD = [J, N];

describe("encodePlanCookParam / decodePlanCookParam", () => {
  it("round-trips multi-combination sessions", () => {
    const combinations: CookingCombination[] = [
      { count: 2, memberIds: [J, N] },
      { count: 1, memberIds: [J] },
    ];

    const encoded = encodePlanCookParam(combinations);
    expect(encoded).toBe(`${J},${N}:2;${J}:1`);
    expect(decodePlanCookParam(encoded, HOUSEHOLD)).toEqual({
      combinations,
      dateKeys: [],
    });
  });

  it("round-trips combinations with plan slot dates", () => {
    const combinations: CookingCombination[] = [
      { count: 1, memberIds: [J, N] },
    ];
    const encoded = encodePlanCookParam(combinations, [
      "2026-06-16",
      "2026-06-14",
      "2026-06-15",
      "2026-06-14",
    ]);
    expect(encoded).toBe(
      `2026-06-14,2026-06-15,2026-06-16|${J},${N}:1`,
    );
    expect(decodePlanCookParam(encoded, HOUSEHOLD)).toEqual({
      combinations,
      dateKeys: ["2026-06-14", "2026-06-15", "2026-06-16"],
    });
  });

  it("resolves empty member segments to the current household", () => {
    expect(decodePlanCookParam(":1", HOUSEHOLD)).toEqual({
      combinations: [{ count: 1, memberIds: HOUSEHOLD }],
      dateKeys: [],
    });
  });

  it("filters unknown member ids and falls back when none remain", () => {
    expect(
      decodePlanCookParam(`${J},deleted-member:1`, HOUSEHOLD),
    ).toEqual({
      combinations: [{ count: 1, memberIds: [J] }],
      dateKeys: [],
    });

    expect(
      decodePlanCookParam("deleted-a,deleted-b:2", HOUSEHOLD),
    ).toEqual({
      combinations: [{ count: 2, memberIds: HOUSEHOLD }],
      dateKeys: [],
    });
  });

  it("returns null for malformed input", () => {
    expect(decodePlanCookParam("", HOUSEHOLD)).toBeNull();
    expect(decodePlanCookParam("no-colon", HOUSEHOLD)).toBeNull();
    expect(decodePlanCookParam(`${J}:abc`, HOUSEHOLD)).toBeNull();
    expect(decodePlanCookParam(`${J}:0`, HOUSEHOLD)).toBeNull();
    expect(decodePlanCookParam(`${J}:-1`, HOUSEHOLD)).toBeNull();
  });

  it("keeps empty audiences when the household itself is empty", () => {
    const encoded = encodePlanCookParam([{ count: 1, memberIds: [] }]);
    expect(encoded).toBe(":1");
    expect(decodePlanCookParam(encoded, [])).toEqual({
      combinations: [{ count: 1, memberIds: [] }],
      dateKeys: [],
    });
  });

  it("accepts a still-URI-encoded cook value", () => {
    const encoded = encodeURIComponent(`${J},${N}:2`);
    expect(decodePlanCookParam(encoded, HOUSEHOLD)).toEqual({
      combinations: [{ count: 2, memberIds: [J, N] }],
      dateKeys: [],
    });
  });
});

describe("formatPlanCookSessionDates", () => {
  it("formats a single day as ordinal + short month", () => {
    expect(formatPlanCookSessionDates(["2026-06-14"])).toBe("14th Jun");
  });

  it("formats multiple days in the same month with of + long month", () => {
    expect(
      formatPlanCookSessionDates([
        "2026-06-16",
        "2026-06-14",
        "2026-06-15",
      ]),
    ).toBe("14th, 15th, 16th of June");
  });

  it("formats mixed months as short month per day", () => {
    expect(
      formatPlanCookSessionDates(["2026-06-14", "2026-07-02"]),
    ).toBe("14th Jun, 2nd Jul");
  });
});

describe("formatPlanCookSessionBanner", () => {
  it("includes dates when present", () => {
    expect(
      formatPlanCookSessionBanner({
        dateKeys: ["2026-06-14"],
        mealCount: 1,
      }),
    ).toBe("Meals setup for 14th Jun (1 meal).");
    expect(
      formatPlanCookSessionBanner({
        dateKeys: ["2026-06-14", "2026-06-15", "2026-06-16"],
        mealCount: 3,
      }),
    ).toBe("Meals setup for 14th, 15th, 16th of June (3 meals).");
  });

  it("falls back when dates are missing", () => {
    expect(
      formatPlanCookSessionBanner({ dateKeys: [], mealCount: 4 }),
    ).toBe("Meals setup for your meal plan (4 meals).");
  });
});
