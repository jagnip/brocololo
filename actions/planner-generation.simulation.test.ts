import { describe, expect, it, vi } from "vitest";
import { generatePlan } from "./planner-actions";
import { getRecipes } from "@/lib/db/recipes";
import { TIME_LIMIT_DEFAULTS } from "@/lib/constants";
import { getDaysInRange } from "@/lib/planner/helpers";
import type { DayTimeLimitsType } from "@/lib/validations/planner";
import { createMockCategory, createMockRecipe } from "@/lib/tests/test-helpers";

vi.mock("@/lib/db/recipes", () => ({
  getRecipes: vi.fn(),
}));

// These imports exist in planner-actions module scope; mock them so the test
// only focuses on generatePlan behavior and does not depend on Next runtime.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

function buildDailyTimeLimitsFromDefaults(start: Date, end: Date): DayTimeLimitsType[] {
  // Mirror planner-form behavior: every day has explicit limits prefilled from defaults.
  return getDaysInRange(start, end).map((day) => {
    const defaults = TIME_LIMIT_DEFAULTS[day.getUTCDay()];
    return {
      date: day.toISOString().slice(0, 10),
      breakfastHandsOnMax: defaults.breakfastHandsOnMax,
      lunchHandsOnMax: defaults.lunchHandsOnMax,
      dinnerHandsOnMax: defaults.dinnerHandsOnMax,
      breakfastTotalMax: defaults.breakfastTotalMax,
      lunchTotalMax: defaults.lunchTotalMax,
      dinnerTotalMax: defaults.dinnerTotalMax,
    };
  });
}

function buildSimulationRecipes() {
  const breakfastOccasion = createMockCategory({
    id: "occasion-breakfast",
    name: "Breakfast",
    slug: "breakfast",
    type: "MEAL_OCCASION",
  });
  const lunchOccasion = createMockCategory({
    id: "occasion-lunch",
    name: "Lunch",
    slug: "lunch",
    type: "MEAL_OCCASION",
  });
  const dinnerOccasion = createMockCategory({
    id: "occasion-dinner",
    name: "Dinner",
    slug: "dinner",
    type: "MEAL_OCCASION",
  });

  const proteinSlugs = ["chicken", "fish", "beef", "tofu"] as const;

  const breakfastRecipes = Array.from({ length: 9 }, (_, index) =>
    createMockRecipe({
      id: `sweet-${index}`,
      name: `Sweet ${index}`,
      categories: [breakfastOccasion],
      servings: 2, // Avoid batch carry-forward for this baseline simulation.
      handsOnTime: 10 + (index % 2) * 5, // Always <= weekday breakfast hands-on default (15).
      totalTime: 15 + (index % 3) * 5,
      lastUsedInPlanner: null,
    }),
  );

  const savouryRecipes = Array.from({ length: 20 }, (_, index) =>
    createMockRecipe({
      id: `savoury-${index}`,
      name: `Savoury ${index}`,
      categories: [
        lunchOccasion,
        dinnerOccasion,
        createMockCategory({
          id: `protein-${index}`,
          name: proteinSlugs[index % proteinSlugs.length],
          slug: proteinSlugs[index % proteinSlugs.length],
          type: "PROTEIN",
        }),
      ],
      servings: 2, // Avoid batch carry-forward for this baseline simulation.
      handsOnTime: 15 + (index % 2) * 5, // Always <= weekday lunch hands-on default (20).
      totalTime: 25 + (index % 2) * 5, // Always <= weekday lunch/dinner total default (30).
      lastUsedInPlanner: null,
    }),
  );

  // Planner currently scores deterministically, so fixed fixture order is intentional.
  return [...breakfastRecipes, ...savouryRecipes];
}

function getPlanMetrics(plan: NonNullable<Awaited<ReturnType<typeof generatePlan>> extends { type: "success"; plan: infer T } ? T : never>) {
  const recipeIds = plan.map((slot) => slot.recipe?.id).filter((id): id is string => Boolean(id));
  const uniqueRecipeCount = new Set(recipeIds).size;
  const usageByRecipe = new Map<string, number>();
  for (const recipeId of recipeIds) {
    usageByRecipe.set(recipeId, (usageByRecipe.get(recipeId) ?? 0) + 1);
  }

  return {
    totalAssignedSlots: recipeIds.length,
    uniqueRecipeCount,
    uniqueRecipeRatio: recipeIds.length > 0 ? uniqueRecipeCount / recipeIds.length : 0,
    maxRepeatCount: usageByRecipe.size > 0 ? Math.max(...usageByRecipe.values()) : 0,
  };
}

function printPlanForReview(
  label: string,
  plan: NonNullable<Awaited<ReturnType<typeof generatePlan>> extends { type: "success"; plan: infer T } ? T : never>,
) {
  // Group by day so manual inspection matches how humans review meal plans.
  const byDay = new Map<string, Array<{ mealType: string; recipeName: string }>>();
  for (const slot of plan) {
    const dayKey = slot.date.toISOString().slice(0, 10);
    const rows = byDay.get(dayKey) ?? [];
    rows.push({
      mealType: slot.mealType,
      recipeName: slot.recipe?.name ?? "EMPTY",
    });
    byDay.set(dayKey, rows);
  }

  console.log(`\n=== ${label} ===`);
  for (const [day, rows] of byDay) {
    console.log(day);
    for (const row of rows) {
      console.log(`  - ${row.mealType}: ${row.recipeName}`);
    }
  }
}

describe("planner generation simulation with default time limits", () => {
  it("returns deterministic output for identical inputs", async () => {
    vi.mocked(getRecipes).mockResolvedValue(buildSimulationRecipes());

    const start = new Date("2026-04-20T00:00:00.000Z");
    const end = new Date("2026-04-26T00:00:00.000Z");
    const dailyTimeLimits = buildDailyTimeLimitsFromDefaults(start, end);

    const first = await generatePlan(start, end, dailyTimeLimits, [], []);
    const second = await generatePlan(start, end, dailyTimeLimits, [], []);

    expect(first.type).toBe("success");
    expect(second.type).toBe("success");
    if (first.type !== "success" || second.type !== "success") return;

    // This makes deterministic behavior explicit, so randomness can be introduced deliberately later.
    expect(first.plan.map((slot) => slot.recipe?.id)).toEqual(
      second.plan.map((slot) => slot.recipe?.id),
    );
  });

  it("keeps baseline variety above a minimum threshold", async () => {
    vi.mocked(getRecipes).mockResolvedValue(buildSimulationRecipes());

    const start = new Date("2026-04-20T00:00:00.000Z");
    const end = new Date("2026-04-26T00:00:00.000Z");
    const dailyTimeLimits = buildDailyTimeLimitsFromDefaults(start, end);

    const result = await generatePlan(start, end, dailyTimeLimits, [], []);
    expect(result.type).toBe("success");
    if (result.type !== "success") return;

    const metrics = getPlanMetrics(result.plan);

    // Conservative baseline for current algorithm. Tighten these as scoring improves.
    expect(metrics.uniqueRecipeRatio).toBeGreaterThanOrEqual(0.55);
    expect(metrics.maxRepeatCount).toBeLessThanOrEqual(3);
  });

  it.runIf(process.env.PLANNER_DEBUG === "1")(
    "prints multiple generated plans for manual review",
    async () => {
      vi.mocked(getRecipes).mockResolvedValue(buildSimulationRecipes());

      // Fixed ranges let you compare output across edits to scoring logic.
      const windows = [
        {
          label: "Week A",
          start: new Date("2026-04-20T00:00:00.000Z"),
          end: new Date("2026-04-26T00:00:00.000Z"),
        },
        {
          label: "Week B",
          start: new Date("2026-04-27T00:00:00.000Z"),
          end: new Date("2026-05-03T00:00:00.000Z"),
        },
        {
          label: "Week C",
          start: new Date("2026-05-04T00:00:00.000Z"),
          end: new Date("2026-05-10T00:00:00.000Z"),
        },
      ];

      for (const window of windows) {
        const dailyTimeLimits = buildDailyTimeLimitsFromDefaults(window.start, window.end);
        const result = await generatePlan(window.start, window.end, dailyTimeLimits, [], []);
        expect(result.type).toBe("success");
        if (result.type !== "success") continue;

        printPlanForReview(window.label, result.plan);
        console.log("metrics", getPlanMetrics(result.plan));
      }
    },
  );
});
