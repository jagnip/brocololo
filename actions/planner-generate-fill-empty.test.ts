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
