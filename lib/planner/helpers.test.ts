import { describe, expect, it } from "vitest";
import { getPlannerMealCountForAudience } from "@/lib/planner/helpers";

describe("getPlannerMealCountForAudience", () => {
  it("counts meals by selected planner audience size", () => {
    // A six-serving recipe feeds three selected people for two planned meals.
    expect(getPlannerMealCountForAudience({ servings: 6 }, 3)).toBe(2);
  });

  it("does not use member appetite multipliers for planner meal count", () => {
    // Multipliers affect the nutrition split, but planner yield is plate count.
    expect(getPlannerMealCountForAudience({ servings: 4 }, 2)).toBe(2);
  });

  it("returns zero when no planner audience is selected", () => {
    expect(getPlannerMealCountForAudience({ servings: 4 }, 0)).toBe(0);
  });
});
