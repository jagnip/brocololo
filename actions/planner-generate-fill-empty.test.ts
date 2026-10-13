import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatePlan } from "./planner-actions";
import { getRecipes } from "@/lib/db/recipes";
import { listFamilyMembers } from "@/lib/db/family-members";
import { getDaysInRange } from "@/lib/planner/helpers";
import {
  createDefaultAudienceGroups,
  mapGroupAudienceToDaily,
} from "@/lib/planner/audience-mapping";
import { createMockCategory, createMockRecipe } from "@/lib/tests/test-helpers";
import type { PlanInputType } from "@/types/planner";
import type { DayTimeLimitsType } from "@/lib/validations/planner";
import { TIME_LIMIT_DEFAULTS } from "@/lib/constants";

vi.mock("@/lib/db/recipes", () => ({
  getRecipes: vi.fn(),
}));

vi.mock("@/lib/db/family-members", () => ({
  listFamilyMembers: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn().mockResolvedValue({ id: "user-1", clerkId: "clerk-1" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const MEMBER_ID = "member-1";

function buildAudience(start: Date, end: Date) {
  return mapGroupAudienceToDaily(
    getDaysInRange(start, end),
    createDefaultAudienceGroups([MEMBER_ID]),
  );
}

function buildTimeLimits(start: Date, end: Date): DayTimeLimitsType[] {
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

function setupRecipeLibrary() {
  const breakfast = createMockCategory({
    id: "occ-b",
    name: "Breakfast",
    slug: "breakfast",
    type: "MEAL_OCCASION",
  });
  const lunch = createMockCategory({
    id: "occ-l",
    name: "Lunch",
    slug: "lunch",
    type: "MEAL_OCCASION",
  });
  const dinner = createMockCategory({
    id: "occ-d",
    name: "Dinner",
    slug: "dinner",
    type: "MEAL_OCCASION",
  });

  vi.mocked(listFamilyMembers).mockResolvedValue([
    { id: MEMBER_ID, name: "Test", userId: "user-1" } as never,
  ]);

  vi.mocked(getRecipes).mockResolvedValue([
    createMockRecipe({
      id: "b1",
      name: "Oats",
      categories: [breakfast],
      handsOnTime: 10,
      totalTime: 10,
      plannedMealCount: 1,
    }),
    createMockRecipe({
      id: "l1",
      name: "Salad",
      categories: [lunch],
      handsOnTime: 15,
      totalTime: 15,
      plannedMealCount: 1,
    }),
    createMockRecipe({
      id: "d1",
      name: "Soup",
      categories: [dinner],
      handsOnTime: 20,
      totalTime: 30,
      plannedMealCount: 1,
    }),
    // Multi-meal dinner used to assert batch spill does not overwrite filled slots.
    createMockRecipe({
      id: "d-batch",
      name: "Batch Stew",
      categories: [dinner],
      handsOnTime: 25,
      totalTime: 40,
      plannedMealCount: 2,
      isBatchRecipe: true,
    }),
  ]);
}

describe("generatePlan fill-empty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupRecipeLibrary();
  });

  it.each([true, false])("allocates rolling counts once across meal occasions (batch=%s)", async (isBatchRecipe) => {
    const start = new Date("2026-04-20T00:00:00.000Z");
    const end = new Date("2026-04-22T00:00:00.000Z");
    const recipe = createMockRecipe({
      id: "rolling",
      isBatchRecipe,
      plannedMealCount: 2,
      handsOnTime: 10,
      totalTime: 10,
      categories: ["breakfast", "lunch", "dinner"].map((slug) => createMockCategory({ slug, type: "MEAL_OCCASION" })),
    });
    vi.mocked(getRecipes).mockResolvedValue([recipe]);
    const result = await generatePlan(start, end, buildAudience(start, end), buildTimeLimits(start, end), [], [{ recipeId: recipe.id, meals: 2 }]);
    expect(result.type).toBe("success");
    if (result.type !== "success") return;
    expect(result.plan.filter((slot) => slot.isRolledOver)).toHaveLength(2);
    expect(result.plan.filter((slot) => slot.isRolledOver === false)).toHaveLength(7);
    expect(result.plan.every((slot) => slot.alreadyCooked === false)).toBe(true);
    expect(result.batches.every((batch) => batch.storageRows.length === 0)).toBe(true);
  });

  it("counts prefilled rolling slots before generation, even on later dates", async () => {
    const start = new Date("2026-04-20T00:00:00.000Z");
    const end = new Date("2026-04-22T00:00:00.000Z");
    const recipe = createMockRecipe({
      id: "rolling", isBatchRecipe: true, plannedMealCount: 3, handsOnTime: 10, totalTime: 10,
      categories: [createMockCategory({ slug: "dinner", type: "MEAL_OCCASION" })],
    });
    vi.mocked(getRecipes).mockResolvedValue([recipe]);
    const existingPlan: PlanInputType = [{
      date: end, mealType: "DINNER", recipe, customMeal: null, alternatives: [],
      used: false, isRolledOver: true, alreadyCooked: true, batchGroupId: "existing",
    }];
    const result = await generatePlan(start, end, buildAudience(start, end), buildTimeLimits(start, end), [], [{ recipeId: recipe.id, meals: 2, alreadyCooked: true }], existingPlan);
    expect(result.type).toBe("success");
    if (result.type !== "success") return;
    const dinners = result.plan.filter((slot) => slot.mealType === "DINNER");
    expect(dinners.map((slot) => slot.isRolledOver)).toEqual([true, false, true]);
    expect(dinners.map((slot) => slot.alreadyCooked)).toEqual([true, false, true]);
    expect(dinners[1]?.batchGroupId).not.toBe("existing");
    expect(dinners[2]).toEqual(existingPlan[0]);
  });

  it("uses ten-minute cooked eligibility for initial and continuation slots without mutating recipes", async () => {
    const start = new Date("2026-04-20T00:00:00.000Z");
    const end = new Date("2026-04-24T00:00:00.000Z");
    const recipe = createMockRecipe({
      id: "cooked", isBatchRecipe: true, plannedMealCount: 3, handsOnTime: 60, totalTime: 90,
      categories: [createMockCategory({ slug: "dinner", type: "MEAL_OCCASION" })],
    });
    vi.mocked(getRecipes).mockResolvedValue([recipe]);
    const limits = buildTimeLimits(start, end).map((day, index) => ({
      ...day, dinnerHandsOnMax: [9, 10, 9, 10, 90][index]!, dinnerTotalMax: [9, 10, 9, 10, 90][index]!,
    }));
    const result = await generatePlan(start, end, buildAudience(start, end), limits, [], [{ recipeId: recipe.id, meals: 2, alreadyCooked: true }]);
    expect(result.type).toBe("success");
    if (result.type !== "success") return;
    const dinners = result.plan.filter((slot) => slot.mealType === "DINNER");
    expect(dinners.map((slot) => slot.recipe?.id ?? null)).toEqual([null, "cooked", null, "cooked", "cooked"]);
    expect(dinners.map((slot) => slot.alreadyCooked)).toEqual([false, true, false, true, false]);
    expect(dinners.map((slot) => slot.isRolledOver)).toEqual([false, true, false, true, false]);
    expect(dinners[1]?.batchGroupId).toBe(dinners[3]?.batchGroupId);
    expect(dinners[4]?.batchGroupId).not.toBe(dinners[1]?.batchGroupId);
    expect(dinners[1]?.recipe).toBe(recipe);
    expect(recipe.handsOnTime).toBe(60);
    expect(recipe.totalTime).toBe(90);
    expect(result.batches.every((batch) => batch.storageRows.length === 0)).toBe(true);
  });

  it.each([
    { isBatchRecipe: true, alreadyCooked: false },
    { isBatchRecipe: false, alreadyCooked: true },
  ])("retains original time eligibility for %o", async ({ isBatchRecipe, alreadyCooked }) => {
    const start = new Date("2026-04-20T00:00:00.000Z");
    const recipe = createMockRecipe({
      id: "slow", isBatchRecipe, handsOnTime: 60, totalTime: 90,
      categories: [createMockCategory({ slug: "dinner", type: "MEAL_OCCASION" })],
    });
    vi.mocked(getRecipes).mockResolvedValue([recipe]);
    const limits = buildTimeLimits(start, start).map((day) => ({ ...day, dinnerHandsOnMax: 10, dinnerTotalMax: 10 }));
    const result = await generatePlan(start, start, buildAudience(start, start), limits, [], [{ recipeId: recipe.id, meals: 2, alreadyCooked }]);
    expect(result.type).toBe("error");
  });

  it("preserves filled slots and only fills empty ones", async () => {
    const start = new Date("2026-04-20T00:00:00.000Z");
    const end = new Date("2026-04-20T00:00:00.000Z");
    const handPicked = createMockRecipe({
      id: "hand-picked",
      name: "Overnight oats",
      categories: [
        createMockCategory({
          id: "occ-b",
          name: "Breakfast",
          slug: "breakfast",
          type: "MEAL_OCCASION",
        }),
      ],
    });

    const existingPlan: PlanInputType = [
      {
        date: start,
        mealType: "BREAKFAST",
        recipe: handPicked,
        customMeal: null,
        alternatives: [],
        cookingFamilyMemberIds: [MEMBER_ID],
        used: false,
        batchGroupId: null,
      },
      {
        date: start,
        mealType: "LUNCH",
        recipe: null,
        customMeal: null,
        alternatives: [],
        cookingFamilyMemberIds: [MEMBER_ID],
        used: false,
        batchGroupId: null,
      },
      {
        date: start,
        mealType: "DINNER",
        recipe: null,
        customMeal: null,
        alternatives: [],
        cookingFamilyMemberIds: [MEMBER_ID],
        used: false,
        batchGroupId: null,
      },
    ];

    const result = await generatePlan(
      start,
      end,
      buildAudience(start, end),
      buildTimeLimits(start, end),
      [],
      [],
      existingPlan,
    );

    expect(result.type).toBe("success");
    if (result.type !== "success") return;

    const breakfast = result.plan.find((s) => s.mealType === "BREAKFAST");
    const lunch = result.plan.find((s) => s.mealType === "LUNCH");
    const dinner = result.plan.find((s) => s.mealType === "DINNER");

    expect(breakfast?.recipe?.id).toBe("hand-picked");
    expect(lunch?.recipe).not.toBeNull();
    expect(dinner?.recipe).not.toBeNull();
  });

  it("does not overwrite a filled slot with batch spill from a generated meal", async () => {
    const day1 = new Date("2026-04-20T00:00:00.000Z");
    const day2 = new Date("2026-04-21T00:00:00.000Z");
    // Only expose the batch dinner so day1 dinner must pick it.
    const dinnerOcc = createMockCategory({
      id: "occ-d",
      name: "Dinner",
      slug: "dinner",
      type: "MEAL_OCCASION",
    });
    const breakfastOcc = createMockCategory({
      id: "occ-b",
      name: "Breakfast",
      slug: "breakfast",
      type: "MEAL_OCCASION",
    });
    const lunchOcc = createMockCategory({
      id: "occ-l",
      name: "Lunch",
      slug: "lunch",
      type: "MEAL_OCCASION",
    });
    vi.mocked(getRecipes).mockResolvedValue([
      createMockRecipe({
        id: "b1",
        name: "Oats",
        categories: [breakfastOcc],
        handsOnTime: 10,
        totalTime: 10,
        plannedMealCount: 1,
      }),
      createMockRecipe({
        id: "l1",
        name: "Salad",
        categories: [lunchOcc],
        handsOnTime: 15,
        totalTime: 15,
        plannedMealCount: 1,
      }),
      createMockRecipe({
        id: "d-batch",
        name: "Batch Stew",
        categories: [dinnerOcc],
        handsOnTime: 25,
        totalTime: 40,
        plannedMealCount: 2,
        isBatchRecipe: true,
      }),
    ]);

    const preservedDinner = createMockRecipe({
      id: "user-dinner",
      name: "User dinner",
      categories: [dinnerOcc],
    });

    const existingPlan: PlanInputType = [
      {
        date: day1,
        mealType: "BREAKFAST",
        recipe: null,
        customMeal: null,
        alternatives: [],
        used: false,
      },
      {
        date: day1,
        mealType: "LUNCH",
        recipe: null,
        customMeal: null,
        alternatives: [],
        used: false,
      },
      {
        date: day1,
        mealType: "DINNER",
        recipe: null,
        customMeal: null,
        alternatives: [],
        used: false,
      },
      {
        date: day2,
        mealType: "BREAKFAST",
        recipe: null,
        customMeal: null,
        alternatives: [],
        used: false,
      },
      {
        date: day2,
        mealType: "LUNCH",
        recipe: null,
        customMeal: null,
        alternatives: [],
        used: false,
      },
      // Day-2 dinner already filled — batch spill from day-1 must not overwrite.
      {
        date: day2,
        mealType: "DINNER",
        recipe: preservedDinner,
        customMeal: null,
        alternatives: [],
        cookingFamilyMemberIds: [MEMBER_ID],
        used: false,
        batchGroupId: null,
      },
    ];

    const result = await generatePlan(
      day1,
      day2,
      buildAudience(day1, day2),
      buildTimeLimits(day1, day2),
      [],
      [],
      existingPlan,
    );

    expect(result.type).toBe("success");
    if (result.type !== "success") return;

    const day2Dinner = result.plan.find(
      (s) =>
        s.mealType === "DINNER" &&
        s.date.toISOString().slice(0, 10) === "2026-04-21",
    );
    expect(day2Dinner?.recipe?.id).toBe("user-dinner");
  });
});
