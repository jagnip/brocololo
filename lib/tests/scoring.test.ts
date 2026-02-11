import { describe, it, expect } from "vitest";
import {
  scoreLastUsed,
  scoreAlreadyInPlan,
  pickBestCandidate,
  type ScoringContext,
} from "../planner/scoring";
import { createMockRecipe } from "./test-helpers";

function createCtx(
  overrides?: Partial<ScoringContext>
): ScoringContext {
  return {
    slotsAssignedSoFar: [],
    currentSlot: { date: new Date("2026-02-10"), mealType: "DINNER" },
    maxDaysSinceLastUsedCandidate: 30,
    ...overrides,
  };
}

// ============================================================================
// scoreLastUsed
// ============================================================================

describe("scoreLastUsed", () => {
  it("returns 1 for a recipe never used in a plan", () => {
    const recipe = createMockRecipe({ lastUsedInPlanner: null });
    const ctx = createCtx();

    expect(scoreLastUsed(recipe, ctx)).toBe(1);
  });

  it("returns 1 when maxDaysSinceLastUsed is 0 (all candidates used same day)", () => {
    const recipe = createMockRecipe({
      lastUsedInPlanner: new Date("2026-02-10"),
    });
    const ctx = createCtx({ maxDaysSinceLastUsedCandidate: 0 });

    expect(scoreLastUsed(recipe, ctx)).toBe(1);
  });

  it("returns 1 for the candidate with the longest gap (relative scoring)", () => {
    const recipe = createMockRecipe({
      lastUsedInPlanner: new Date("2026-01-11"), // 30 days ago
    });
    const ctx = createCtx({ maxDaysSinceLastUsedCandidate: 30 });

    expect(scoreLastUsed(recipe, ctx)).toBe(1);
  });

  it("returns 0.5 for a recipe used halfway through the max gap", () => {
    const recipe = createMockRecipe({
      lastUsedInPlanner: new Date("2026-01-26"), // 15 days ago
    });
    const ctx = createCtx({ maxDaysSinceLastUsedCandidate: 30 });

    expect(scoreLastUsed(recipe, ctx)).toBe(0.5);
  });

  it("returns a low score for a recently used recipe", () => {
    const recipe = createMockRecipe({
      lastUsedInPlanner: new Date("2026-02-08"), // 2 days ago
    });
    const ctx = createCtx({ maxDaysSinceLastUsedCandidate: 30 });

    const score = scoreLastUsed(recipe, ctx);
    expect(score).toBeCloseTo(2 / 30);
  });

  it("returns 0 for a recipe used on the slot date", () => {
    const recipe = createMockRecipe({
      lastUsedInPlanner: new Date("2026-02-10"), // same day as slot
    });
    const ctx = createCtx({ maxDaysSinceLastUsedCandidate: 30 });

    expect(scoreLastUsed(recipe, ctx)).toBe(0);
  });
});

// ============================================================================
// scoreAlreadyInPlan
// ============================================================================

describe("scoreAlreadyInPlan", () => {
  it("returns 1 for a recipe not yet in the plan", () => {
    const recipe = createMockRecipe({ id: "recipe-A" });
    const ctx = createCtx({ slotsAssignedSoFar: [] });

    expect(scoreAlreadyInPlan(recipe, ctx)).toBe(1);
  });

  it("returns 0.5 for a recipe used once in the plan", () => {
    const recipe = createMockRecipe({ id: "recipe-A" });
    const ctx = createCtx({
      slotsAssignedSoFar: [
        {
          date: new Date("2026-02-09"),
          mealType: "LUNCH",
          recipe: createMockRecipe({ id: "recipe-A" }),
        },
      ],
    });

    expect(scoreAlreadyInPlan(recipe, ctx)).toBe(0.5);
  });

  it("returns 0 for a recipe used twice in the plan", () => {
    const recipe = createMockRecipe({ id: "recipe-A" });
    const ctx = createCtx({
      slotsAssignedSoFar: [
        {
          date: new Date("2026-02-09"),
          mealType: "LUNCH",
          recipe: createMockRecipe({ id: "recipe-A" }),
        },
        {
          date: new Date("2026-02-09"),
          mealType: "DINNER",
          recipe: createMockRecipe({ id: "recipe-A" }),
        },
      ],
    });

    expect(scoreAlreadyInPlan(recipe, ctx)).toBe(0);
  });

  it("returns 0 (not negative) for a recipe used three times", () => {
    const recipe = createMockRecipe({ id: "recipe-A" });
    const ctx = createCtx({
      slotsAssignedSoFar: [
        {
          date: new Date("2026-02-08"),
          mealType: "DINNER",
          recipe: createMockRecipe({ id: "recipe-A" }),
        },
        {
          date: new Date("2026-02-09"),
          mealType: "LUNCH",
          recipe: createMockRecipe({ id: "recipe-A" }),
        },
        {
          date: new Date("2026-02-09"),
          mealType: "DINNER",
          recipe: createMockRecipe({ id: "recipe-A" }),
        },
      ],
    });

    expect(scoreAlreadyInPlan(recipe, ctx)).toBe(0);
  });

  it("is not affected by other recipes in the plan", () => {
    const recipe = createMockRecipe({ id: "recipe-A" });
    const ctx = createCtx({
      slotsAssignedSoFar: [
        {
          date: new Date("2026-02-09"),
          mealType: "LUNCH",
          recipe: createMockRecipe({ id: "recipe-B" }),
        },
        {
          date: new Date("2026-02-09"),
          mealType: "DINNER",
          recipe: createMockRecipe({ id: "recipe-C" }),
        },
      ],
    });

    expect(scoreAlreadyInPlan(recipe, ctx)).toBe(1);
  });
});

// ============================================================================
// pickBestCandidate
// ============================================================================

describe("pickBestCandidate", () => {
  it("picks the recipe with the highest combined score", () => {
    const neverUsed = createMockRecipe({
      id: "never-used",
      name: "Never Used",
      lastUsedInPlanner: null,
    });
    const recentlyUsed = createMockRecipe({
      id: "recently-used",
      name: "Recently Used",
      lastUsedInPlanner: new Date("2026-02-08"),
    });
    const ctx = createCtx({
      maxDaysSinceLastUsedCandidate: 30,
      slotsAssignedSoFar: [],
    });

    const result = pickBestCandidate([recentlyUsed, neverUsed], ctx);
    expect(result.id).toBe("never-used");
  });

  it("prefers an unused recipe over one already in the plan", () => {
    const fresh = createMockRecipe({
      id: "fresh",
      name: "Fresh",
      lastUsedInPlanner: new Date("2026-01-20"), // 21 days ago
    });
    const alreadyPicked = createMockRecipe({
      id: "already-picked",
      name: "Already Picked",
      lastUsedInPlanner: null, // never used historically
    });
    const ctx = createCtx({
      maxDaysSinceLastUsedCandidate: 21,
      slotsAssignedSoFar: [
        {
          date: new Date("2026-02-09"),
          mealType: "LUNCH",
          recipe: createMockRecipe({ id: "already-picked" }),
        },
      ],
    });

    // fresh: lastUsed=21/21=1.0 * 2 + alreadyInPlan=1.0 * 3 = 5.0
    // alreadyPicked: lastUsed=1.0 * 2 + alreadyInPlan=0.5 * 3 = 3.5
    const result = pickBestCandidate([fresh, alreadyPicked], ctx);
    expect(result.id).toBe("fresh");
  });

  it("returns the only candidate when there is one", () => {
    const only = createMockRecipe({ id: "only-one" });
    const ctx = createCtx();

    const result = pickBestCandidate([only], ctx);
    expect(result.id).toBe("only-one");
  });
});
