import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlannerMealType } from "@/src/generated/client";
import type { SlotInputType } from "@/types/planner";
import { createPlan, getPlanById, getPlanForGroceries, getUnusedRecipesFromLatestPlan } from "./planner";
import { prisma } from "./index";

vi.mock("./index", () => ({
  prisma: {
    $transaction: vi.fn(),
    plan: { findFirst: vi.fn() },
    familyMember: { findMany: vi.fn() },
    recipe: { updateMany: vi.fn() },
  },
}));

beforeEach(() => vi.resetAllMocks());

describe("previous-plan recipes", () => {
  it("combines unused scheduled meals and all storage by recipe, ignoring extras and excluded recipes", async () => {
    vi.mocked(prisma.plan.findFirst).mockResolvedValue({
      slots: [
        { recipeId: "r1", recipe: { excludeFromPlanner: false } },
        { recipeId: "r1", recipe: { excludeFromPlanner: false } },
        { recipeId: "excluded", recipe: { excludeFromPlanner: true } },
      ],
      batches: [
        { recipeId: "r1", recipe: { excludeFromPlanner: false }, extraPortions: 99, storageRows: [{ count: 2 }, { count: 3 }] },
        { recipeId: "stored-only", recipe: { excludeFromPlanner: false }, storageRows: [{ count: 4 }] },
        { recipeId: "r1", recipe: { excludeFromPlanner: false }, storageRows: [{ count: 1 }] },
        { recipeId: "excluded", recipe: { excludeFromPlanner: true }, storageRows: [{ count: 10 }] },
        { recipeId: "extras-only", recipe: { excludeFromPlanner: false }, extraPortions: 5, storageRows: [] },
      ],
    } as never);
    expect(await getUnusedRecipesFromLatestPlan("user-1")).toEqual([
      { recipeId: "r1", meals: 8, alreadyCooked: false },
      { recipeId: "stored-only", meals: 4, alreadyCooked: false },
    ]);
    expect(prisma.plan.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
      select: expect.objectContaining({
        slots: expect.objectContaining({ where: { used: false, recipeId: { not: null } } }),
      }),
    }));
  });

  it("returns no recipes without a previous plan", async () => {
    vi.mocked(prisma.plan.findFirst).mockResolvedValue(null);
    expect(await getUnusedRecipesFromLatestPlan("user-1")).toEqual([]);
  });
});

describe("slot metadata persistence", () => {
  it.each([true, undefined])("creates both flags with input %j, defaulting omitted values to false", async (flag) => {
    const create = vi.fn().mockResolvedValue({ id: "plan-1" });
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      (callback as (tx: unknown) => Promise<unknown>)({
        logEntry: { findMany: vi.fn().mockResolvedValue([]) },
        plan: { create },
        recipe: { count: vi.fn().mockResolvedValue(1) },
      }),
    );
    const slot: SlotInputType = {
      date: new Date("2026-10-12T00:00:00.000Z"),
      mealType: PlannerMealType.DINNER,
      recipe: { id: "batch-recipe" } as SlotInputType["recipe"],
      customMeal: null,
      alternatives: [],
      used: false,
      isRolledOver: flag,
      alreadyCooked: flag,
    };
    expect((await createPlan("user-1", slot.date, slot.date, [slot])).type).toBe("success");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        slots: { create: [expect.objectContaining({ isRolledOver: flag ?? false, alreadyCooked: flag ?? false })] },
      }),
    }));
  });

  it("loads flags and storage for grocery calculations", async () => {
    vi.mocked(prisma.plan.findFirst).mockResolvedValue({
      startDate: new Date("2026-10-12"),
      endDate: new Date("2026-10-12"),
      batches: [],
      slots: [{
        id: "slot-1",
        date: new Date("2026-10-12"),
        mealType: PlannerMealType.DINNER,
        recipeId: null,
        recipe: null,
        customName: "Custom",
        customIngredients: [],
        alternatives: [],
        audienceMembers: [],
        used: false,
        isRolledOver: true,
        alreadyCooked: true,
      }],
    } as never);
    vi.mocked(prisma.familyMember.findMany).mockResolvedValue([]);
    expect((await getPlanById("user-1", "plan-1"))?.[0]).toMatchObject({ isRolledOver: true, alreadyCooked: true });
    expect((await getPlanForGroceries("user-1", "plan-1"))?.slots[0]).toMatchObject({ isRolledOver: true, alreadyCooked: true });
    const query = vi.mocked(prisma.plan.findFirst).mock.calls[1][0];
    expect(query?.include).toHaveProperty("batches");
  });
});
