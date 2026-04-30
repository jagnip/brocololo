import { describe, it, expect } from "vitest";
import { PlannerMealType } from "@/src/generated/enums";
import { filterByMealOccasion, filterByTotalTime, filterByHandsOnTime } from "../planner/filters";
import { createMockRecipe } from "./test-helpers";

describe("filterByMealOccasion", () => {
  it("keeps recipes matching breakfast occasion", () => {
    const recipes = [
      createMockRecipe({
        id: "breakfast-only",
        categories: [{ id: "c1", name: "Breakfast", slug: "breakfast", type: "MEAL_OCCASION" }],
      }),
      createMockRecipe({
        id: "dinner-only",
        categories: [{ id: "c2", name: "Dinner", slug: "dinner", type: "MEAL_OCCASION" }],
      }),
    ];

    const result = filterByMealOccasion(recipes, PlannerMealType.BREAKFAST);
    expect(result.map((recipe) => recipe.id)).toEqual(["breakfast-only"]);
  });

  it("excludes recipes without any meal occasion", () => {
    const recipes = [
      createMockRecipe({
        id: "untagged",
        categories: [{ id: "protein-1", name: "Chicken", slug: "chicken", type: "PROTEIN" }],
      }),
    ];
    const result = filterByMealOccasion(recipes, PlannerMealType.DINNER);
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// filterByTotalTime
// ============================================================================

describe("filterByTotalTime", () => {
  it("returns all recipes when maxTotalTime is null (no constraint)", () => {
    const recipes = [
      createMockRecipe({ id: "r1", totalTime: 60 }),
      createMockRecipe({ id: "r2", totalTime: 120 }),
    ];

    const result = filterByTotalTime(recipes, null);
    expect(result).toHaveLength(2);
  });

  it("keeps recipes with totalTime equal to the limit", () => {
    const recipes = [
      createMockRecipe({ id: "r1", totalTime: 30 }),
    ];

    const result = filterByTotalTime(recipes, 30);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("r1");
  });

  it("keeps recipes under the limit and removes those over", () => {
    const recipes = [
      createMockRecipe({ id: "fast", totalTime: 20 }),
      createMockRecipe({ id: "slow", totalTime: 90 }),
      createMockRecipe({ id: "medium", totalTime: 45 }),
    ];

    const result = filterByTotalTime(recipes, 45);
    expect(result.map((r) => r.id)).toEqual(["fast", "medium"]);
  });

  it("returns empty array when no recipes meet the limit", () => {
    const recipes = [
      createMockRecipe({ id: "r1", totalTime: 60 }),
      createMockRecipe({ id: "r2", totalTime: 90 }),
    ];

    const result = filterByTotalTime(recipes, 30);
    expect(result).toHaveLength(0);
  });

  it("returns empty array when given empty input", () => {
    expect(filterByTotalTime([], 30)).toHaveLength(0);
    expect(filterByTotalTime([], null)).toHaveLength(0);
  });
});

// ============================================================================
// filterByHandsOnTime
// ============================================================================

describe("filterByHandsOnTime", () => {
  it("returns all recipes when maxHandsOnTime is null (no constraint)", () => {
    const recipes = [
      createMockRecipe({ id: "r1", handsOnTime: 10 }),
      createMockRecipe({ id: "r2", handsOnTime: 60 }),
    ];

    const result = filterByHandsOnTime(recipes, null);
    expect(result).toHaveLength(2);
  });

  it("keeps recipes with handsOnTime equal to the limit", () => {
    const recipes = [
      createMockRecipe({ id: "r1", handsOnTime: 15 }),
    ];

    const result = filterByHandsOnTime(recipes, 15);
    expect(result).toHaveLength(1);
  });

  it("keeps recipes under the limit and removes those over", () => {
    const recipes = [
      createMockRecipe({ id: "quick", handsOnTime: 10 }),
      createMockRecipe({ id: "slow", handsOnTime: 45 }),
      createMockRecipe({ id: "medium", handsOnTime: 25 }),
    ];

    const result = filterByHandsOnTime(recipes, 25);
    expect(result.map((r) => r.id)).toEqual(["quick", "medium"]);
  });

  it("returns empty array when no recipes meet the limit", () => {
    const recipes = [
      createMockRecipe({ id: "r1", handsOnTime: 30 }),
    ];

    const result = filterByHandsOnTime(recipes, 10);
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// Both filters applied independently (integration-style)
// ============================================================================

describe("filterByHandsOnTime + filterByTotalTime applied together", () => {
  it("a recipe can pass handsOn but fail total time", () => {
    const recipe = createMockRecipe({ id: "r1", handsOnTime: 10, totalTime: 60 });

    const afterHandsOn = filterByHandsOnTime([recipe], 15);
    const afterTotal = filterByTotalTime(afterHandsOn, 30);

    expect(afterHandsOn).toHaveLength(1);
    expect(afterTotal).toHaveLength(0);
  });

  it("a recipe can pass total time but fail handsOn", () => {
    const recipe = createMockRecipe({ id: "r1", handsOnTime: 40, totalTime: 25 });

    const afterHandsOn = filterByHandsOnTime([recipe], 15);
    const afterTotal = filterByTotalTime(afterHandsOn, 30);

    expect(afterHandsOn).toHaveLength(0);
    expect(afterTotal).toHaveLength(0);
  });

  it("a recipe passing both filters is kept", () => {
    const recipe = createMockRecipe({ id: "r1", handsOnTime: 10, totalTime: 25 });

    const afterHandsOn = filterByHandsOnTime([recipe], 15);
    const afterTotal = filterByTotalTime(afterHandsOn, 30);

    expect(afterTotal).toHaveLength(1);
    expect(afterTotal[0].id).toBe("r1");
  });
});
