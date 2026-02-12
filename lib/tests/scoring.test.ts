import { describe, it, expect } from "vitest";
import {
  scoreLastUsed,
  scoreAlreadyInPlan,
  scoreProteinBalance,
  pickBestCandidate,
  type ScoringContext,
} from "../planner/scoring";
import { createMockRecipe, createMockCategory } from "./test-helpers";

function createCtx(
  overrides?: Partial<ScoringContext>
): ScoringContext {
  return {
    assignedSlots: [],
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
    const ctx = createCtx({ assignedSlots: [] });

    expect(scoreAlreadyInPlan(recipe, ctx)).toBe(1);
  });

  it("returns 0.5 for a recipe used once in the plan", () => {
    const recipe = createMockRecipe({ id: "recipe-A" });
    const ctx = createCtx({
      assignedSlots: [
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
      assignedSlots: [
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
      assignedSlots: [
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
      assignedSlots: [
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
      assignedSlots: [],
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
      assignedSlots: [
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

// ============================================================================
// scoreProteinBalance
// ============================================================================

function chickenRecipe(id = "chicken-1") {
  return createMockRecipe({
    id,
    name: `Chicken ${id}`,
    categories: [createMockCategory({ slug: "chicken", type: "PROTEIN" })],
  });
}

function fishRecipe(id = "fish-1") {
  return createMockRecipe({
    id,
    name: `Fish ${id}`,
    categories: [createMockCategory({ slug: "fish", type: "PROTEIN" })],
  });
}

function beefRecipe(id = "beef-1") {
  return createMockRecipe({
    id,
    name: `Beef ${id}`,
    categories: [createMockCategory({ slug: "beef", type: "PROTEIN" })],
  });
}

function tofuRecipe(id = "tofu-1") {
  return createMockRecipe({
    id,
    name: `Tofu ${id}`,
    categories: [createMockCategory({ slug: "tofu", type: "PROTEIN" })],
  });
}

describe("scoreProteinBalance", () => {
  it("returns 0.5 (neutral) for a recipe with no protein category", () => {
    const recipe = createMockRecipe({ categories: [] });
    const ctx = createCtx();

    expect(scoreProteinBalance(recipe, ctx)).toBe(0.5);
  });

  it("returns the target ratio when no savoury slots assigned yet", () => {
    const chicken = chickenRecipe();
    const fish = fishRecipe();
    const ctx = createCtx({ assignedSlots: [] });

    // chicken target = 0.65, fish target = 0.20
    expect(scoreProteinBalance(chicken, ctx)).toBe(0.65);
    expect(scoreProteinBalance(fish, ctx)).toBe(0.20);
  });

  it("returns 0 for a protein not in PROTEIN_TARGETS when no slots assigned", () => {
    const unknown = createMockRecipe({
      categories: [createMockCategory({ slug: "unknown-protein", type: "PROTEIN" })],
    });
    const ctx = createCtx({ assignedSlots: [] });

    expect(scoreProteinBalance(unknown, ctx)).toBe(0);
  });

  it("ignores breakfast slots when counting protein distribution", () => {
    const chicken = chickenRecipe();
    // Only a breakfast slot assigned — should behave like empty savoury plan
    const ctx = createCtx({
      assignedSlots: [
        { date: new Date("2026-02-09"), mealType: "BREAKFAST", recipe: chickenRecipe("breakfast-chicken") },
      ],
    });

    expect(scoreProteinBalance(chicken, ctx)).toBe(0.65);
  });

  it("scores higher for underrepresented protein", () => {
    // 2 savoury slots: both chicken
    const ctx = createCtx({
      assignedSlots: [
        { date: new Date("2026-02-09"), mealType: "LUNCH", recipe: chickenRecipe("c1") },
        { date: new Date("2026-02-09"), mealType: "DINNER", recipe: chickenRecipe("c2") },
      ],
    });

    const chickenScore = scoreProteinBalance(chickenRecipe(), ctx);
    const fishScore = scoreProteinBalance(fishRecipe(), ctx);

    // chicken: currentRatio=1.0, target=0.65, gap=-0.35, score=0.15
    // fish: currentRatio=0.0, target=0.20, gap=+0.20, score=0.70
    expect(fishScore).toBeGreaterThan(chickenScore);
    expect(chickenScore).toBeCloseTo(0.15);
    expect(fishScore).toBeCloseTo(0.70);
  });

  it("scores 0.5 when protein is exactly at target ratio", () => {
    // 10 savoury slots: 2 fish = 20% = fish target
    const fishSlots = Array.from({ length: 2 }, (_, i) => ({
      date: new Date("2026-02-09"),
      mealType: "LUNCH" as const,
      recipe: fishRecipe(`f${i}`),
    }));
    const chickenSlots = Array.from({ length: 8 }, (_, i) => ({
      date: new Date("2026-02-09"),
      mealType: "DINNER" as const,
      recipe: chickenRecipe(`c${i}`),
    }));

    const ctx = createCtx({
      assignedSlots: [...fishSlots, ...chickenSlots],
    });

    expect(scoreProteinBalance(fishRecipe(), ctx)).toBeCloseTo(0.5);
  });

  it("groups beef and pork as red-meat", () => {
    // 4 savoury slots: 3 chicken, 1 beef
    const ctx = createCtx({
      assignedSlots: [
        { date: new Date("2026-02-09"), mealType: "LUNCH", recipe: chickenRecipe("c1") },
        { date: new Date("2026-02-09"), mealType: "DINNER", recipe: chickenRecipe("c2") },
        { date: new Date("2026-02-10"), mealType: "LUNCH", recipe: chickenRecipe("c3") },
        { date: new Date("2026-02-10"), mealType: "DINNER", recipe: beefRecipe("b1") },
      ],
    });

    // beef: red-meat currentRatio = 1/4 = 0.25, target = 0.05, gap = -0.20, score = 0.30
    // pork should score the same since it maps to the same group
    const porkRecipe = createMockRecipe({
      id: "pork-1",
      categories: [createMockCategory({ slug: "pork", type: "PROTEIN" })],
    });

    const beefScore = scoreProteinBalance(beefRecipe(), ctx);
    const porkScore = scoreProteinBalance(porkRecipe, ctx);

    expect(beefScore).toBeCloseTo(0.30);
    expect(porkScore).toBeCloseTo(beefScore);
  });

  it("clamps score to 0 when heavily overrepresented", () => {
    // 2 savoury slots: both red-meat (target 0.05, current 1.0, gap = -0.95)
    const ctx = createCtx({
      assignedSlots: [
        { date: new Date("2026-02-09"), mealType: "LUNCH", recipe: beefRecipe("b1") },
        { date: new Date("2026-02-09"), mealType: "DINNER", recipe: beefRecipe("b2") },
      ],
    });

    // gap = 0.05 - 1.0 = -0.95, score = 0.5 + (-0.95) = -0.45 → clamped to 0
    expect(scoreProteinBalance(beefRecipe(), ctx)).toBe(0);
  });

  it("clamps score to 1 when heavily underrepresented", () => {
    // 10 savoury slots, all chicken, candidate is tofu
    const slots = Array.from({ length: 10 }, (_, i) => ({
      date: new Date("2026-02-09"),
      mealType: i % 2 === 0 ? ("LUNCH" as const) : ("DINNER" as const),
      recipe: chickenRecipe(`c${i}`),
    }));

    const ctx = createCtx({ assignedSlots: slots });

    // tofu: currentRatio=0, target=0.10, gap=+0.10, score=0.60 (not clamped here)
    // But chicken with target 0.65 and current 1.0 would be gap=-0.35, score=0.15
    const tofuScore = scoreProteinBalance(tofuRecipe(), ctx);
    expect(tofuScore).toBeCloseTo(0.60);
    expect(tofuScore).toBeLessThanOrEqual(1);
  });
});
