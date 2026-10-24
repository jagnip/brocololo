import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlannerMealType } from "@/src/generated/client";
import { getUnusedMealsFromRecentPlans } from "./planner";
import { prisma } from "./index";

vi.mock("./index", () => ({
  prisma: {
    plan: { findMany: vi.fn() },
  },
}));

type SlotFixture = {
  used: boolean;
  mealType: PlannerMealType;
  recipeId: string | null;
  customName: string | null;
  customIngredients: Array<{
    ingredientId: string;
    unitId: string | null;
    amount: number | null;
  }>;
  recipe: { excludeFromPlanner: boolean } | null;
};

function recipeSlot(recipeId: string, used: boolean): SlotFixture {
  return {
    used,
    mealType: PlannerMealType.DINNER,
    recipeId,
    customName: null,
    customIngredients: [],
    recipe: { excludeFromPlanner: false },
  };
}

function customSlot(
  name: string,
  used: boolean,
  mealType: PlannerMealType = PlannerMealType.DINNER,
): SlotFixture {
  return {
    used,
    mealType,
    recipeId: null,
    customName: name,
    customIngredients: [{ ingredientId: "rice", unitId: "g", amount: 100 }],
    recipe: null,
  };
}

function plan(
  slots: SlotFixture[],
  batches: Array<{ recipeId: string; storageRows: Array<{ count: number }> }> = [],
) {
  return {
    slots,
    batches: batches.map((batch) => ({
      ...batch,
      recipe: { excludeFromPlanner: false },
    })),
  };
}

describe("getUnusedMealsFromRecentPlans", () => {
  beforeEach(() => vi.resetAllMocks());

  it("uses completed newer slots as a barrier for older copies", async () => {
    vi.mocked(prisma.plan.findMany).mockResolvedValue([
      plan([recipeSlot("soup", true), recipeSlot("soup", true)]),
      plan([recipeSlot("soup", false), recipeSlot("soup", false)]),
    ] as never);

    await expect(getUnusedMealsFromRecentPlans("user-1")).resolves.toEqual([]);
  });

  it("rolls only unfinished slots and remaining storage from the newest matching plan", async () => {
    vi.mocked(prisma.plan.findMany).mockResolvedValue([
      plan(
        [recipeSlot("soup", true), recipeSlot("soup", false)],
        [{ recipeId: "soup", storageRows: [{ count: 2 }, { count: 1 }] }],
      ),
      plan([recipeSlot("soup", false), recipeSlot("soup", false)]),
    ] as never);

    await expect(getUnusedMealsFromRecentPlans("user-1")).resolves.toEqual([
      { kind: "recipe", recipeId: "soup", meals: 4, alreadyCooked: false },
    ]);
  });

  it("suppresses canonical matching custom meals while retaining other meal types", async () => {
    vi.mocked(prisma.plan.findMany).mockResolvedValue([
      plan([customSlot(" Bowl ", true)]),
      plan([
        customSlot("bowl", false),
        customSlot("BOWL", false, PlannerMealType.LUNCH),
      ]),
    ] as never);

    await expect(getUnusedMealsFromRecentPlans("user-1")).resolves.toEqual([
      {
        kind: "custom",
        mealType: PlannerMealType.LUNCH,
        customMeal: {
          name: "BOWL",
          ingredients: [{ ingredientId: "rice", unitId: "g", amount: 100 }],
        },
        meals: 1,
      },
    ]);
  });

  it("loads completed slots instead of filtering them in the database", async () => {
    vi.mocked(prisma.plan.findMany).mockResolvedValue([] as never);

    await getUnusedMealsFromRecentPlans("user-1");

    expect(prisma.plan.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-1" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 4,
      select: expect.objectContaining({
        slots: expect.objectContaining({
          select: expect.objectContaining({ used: true }),
        }),
      }),
    }));
    const query = vi.mocked(prisma.plan.findMany).mock.calls[0]?.[0];
    expect(query?.select?.slots).not.toHaveProperty("where");
  });
});
