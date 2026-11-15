import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlannerMealType } from "@/src/generated/client";
import type { SlotInputType } from "@/types/planner";
import { createPlan, getPlanById, getPlanForGroceries, getUnusedRecipesFromLatestPlan } from "./planner";
import { prisma } from "./index";
import { getRollingCustomMealKey } from "@/lib/planner/custom-meal-identity";
import { captureUncapturedPlansForRollingTx } from "./rolling-meals";

vi.mock("./rolling-meals", () => ({ captureUncapturedPlansForRollingTx: vi.fn() }));

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
        { recipeId: "r1", recipe: { excludeFromPlanner: false, archivedAt: null } },
        { recipeId: "r1", recipe: { excludeFromPlanner: false, archivedAt: null } },
        { recipeId: "excluded", recipe: { excludeFromPlanner: true, archivedAt: null } },
        { recipeId: "archived", recipe: { excludeFromPlanner: false, archivedAt: new Date() } },
      ],
      batches: [
        { recipeId: "r1", recipe: { excludeFromPlanner: false, archivedAt: null }, extraPortions: 99, storageRows: [{ count: 2 }, { count: 3 }] },
        { recipeId: "stored-only", recipe: { excludeFromPlanner: false, archivedAt: null }, storageRows: [{ count: 4 }] },
        { recipeId: "r1", recipe: { excludeFromPlanner: false, archivedAt: null }, storageRows: [{ count: 1 }] },
        { recipeId: "excluded", recipe: { excludeFromPlanner: true, archivedAt: null }, storageRows: [{ count: 10 }] },
        { recipeId: "archived", recipe: { excludeFromPlanner: false, archivedAt: new Date() }, storageRows: [{ count: 10 }] },
        { recipeId: "extras-only", recipe: { excludeFromPlanner: false, archivedAt: null }, extraPortions: 5, storageRows: [] },
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
  it("consumes a custom queue entry using its original meal type after moving the placement", async () => {
    const customMeal = { name: "Leftovers", ingredients: [] };
    const remove = vi.fn().mockResolvedValue({ count: 1 });
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      (callback as (tx: unknown) => Promise<unknown>)({
        $queryRaw: vi.fn(), logEntry: { findMany: vi.fn().mockResolvedValue([]) },
        plan: { create: vi.fn().mockResolvedValue({ id: "plan-1" }) },
        rollingMealEntry: { findFirst: vi.fn().mockResolvedValue({ count: 1, version: 1, identity: `custom:${getRollingCustomMealKey(PlannerMealType.LUNCH, customMeal)}` }), deleteMany: remove },
      }),
    );
    const slot: SlotInputType = { date: new Date("2026-10-12T00:00:00.000Z"), mealType: PlannerMealType.DINNER,
      recipe: null, customMeal, alternatives: [], used: false, isRolledOver: true,
      rollingQueueClaim: { id: "queue", version: 1, mealType: PlannerMealType.LUNCH } };
    await createPlan("user-1", slot.date, slot.date, [slot]);
    expect(remove).toHaveBeenCalledOnce();
  });

  it("consumes only non-transferred placements and batch remainder from the versioned queue", async () => {
    const update = vi.fn().mockResolvedValue({ count: 1 });
    const create = vi.fn().mockResolvedValue({ id: "plan-1" });
    const lotDelete = vi.fn().mockResolvedValue({ count: 1 });
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      (callback as (tx: unknown) => Promise<unknown>)({
        $queryRaw: vi.fn(),
        logEntry: { findMany: vi.fn().mockResolvedValue([]) },
        plan: { create }, recipe: { count: vi.fn().mockResolvedValue(1) },
        familyMember: { count: vi.fn().mockResolvedValue(0) },
        storedMealLot: { findMany: vi.fn().mockResolvedValue([{ id: "lot", recipeId: "batch-recipe", count: 1, version: 1, cookedAt: new Date(), audienceMembers: [], recipe: { name: "Soup" } }]), deleteMany: lotDelete },
        storedMealEvent: { create: vi.fn() },
        rollingMealEntry: { findFirst: vi.fn().mockResolvedValue({ id: "queue", version: 2, count: 5, identity: "recipe:batch-recipe" }), updateMany: update },
      }),
    );
    const slot: SlotInputType = { date: new Date("2026-10-12T00:00:00.000Z"), mealType: PlannerMealType.DINNER,
      recipe: { id: "batch-recipe" } as SlotInputType["recipe"], customMeal: null, alternatives: [], used: false,
      isRolledOver: true, placementId: "first", batchGroupId: "batch", rollingQueueClaim: { id: "queue", version: 2 } };
    await createPlan("user-1", slot.date, slot.date, [slot, { ...slot, mealType: PlannerMealType.LUNCH, placementId: "second" }], [
      { id: "batch", recipeId: "batch-recipe", rollingQueueClaim: slot.rollingQueueClaim, storageRows: [{ count: 2, cookingFamilyMemberIds: [] }] },
    ]);
    expect(lotDelete).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith({ where: { id: "queue", userId: "user-1", version: 2, count: 5, identity: "recipe:batch-recipe" }, data: { count: { decrement: 3 }, version: { increment: 1 } } });
    expect(create).toHaveBeenCalledOnce();
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(captureUncapturedPlansForRollingTx).mock.invocationCallOrder[0]!);
    expect(vi.mocked(captureUncapturedPlansForRollingTx).mock.invocationCallOrder[0]).toBeLessThan(create.mock.invocationCallOrder[0]!);
  });

  it.each([
    { version: 3, count: 1, identity: "recipe:r" },
    { version: 2, count: 0, identity: "recipe:r" },
    { version: 2, count: 1, identity: "recipe:other" },
  ])("rejects stale, exhausted or mismatched queue entries", async (entry) => {
    const create = vi.fn();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      (callback as (tx: unknown) => Promise<unknown>)({
        $queryRaw: vi.fn(), logEntry: { findMany: vi.fn().mockResolvedValue([]) }, plan: { create },
        storedMealLot: { findMany: vi.fn().mockResolvedValue([]) },
        rollingMealEntry: { findFirst: vi.fn().mockResolvedValue(entry) },
      }),
    );
    const slot: SlotInputType = { date: new Date("2026-10-12T00:00:00.000Z"), mealType: PlannerMealType.DINNER,
      recipe: { id: "r" } as SlotInputType["recipe"], customMeal: null, alternatives: [], used: false,
      isRolledOver: true, rollingQueueClaim: { id: "queue", version: 2 } };
    await expect(createPlan("user-1", slot.date, slot.date, [slot])).rejects.toThrow("ROLLING_MEAL_CONFLICT");
    expect(create).not.toHaveBeenCalled();
    expect(captureUncapturedPlansForRollingTx).not.toHaveBeenCalled();
  });

  it("does not capture plans when the date conflicts", async () => {
    const date = new Date("2026-10-12T00:00:00.000Z");
    const create = vi.fn();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      (callback as (tx: unknown) => Promise<unknown>)({
        logEntry: { findMany: vi.fn().mockResolvedValue([{ date, logId: "log", log: { planId: "old" } }]) },
        plan: { create },
      }),
    );
    const slot: SlotInputType = { date, mealType: PlannerMealType.DINNER, recipe: null, customMeal: null, alternatives: [], used: false };
    expect((await createPlan("user-1", date, date, [slot])).type).toBe("date_conflict");
    expect(captureUncapturedPlansForRollingTx).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("keeps submitted placement identity and resolves remainder when every new batch slot transfers", async () => {
    const create = vi.fn().mockResolvedValue({ id: "plan-1" });
    const eventCreate = vi.fn().mockResolvedValue({});
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      (callback as (tx: unknown) => Promise<unknown>)({
        $queryRaw: vi.fn(),
        logEntry: { findMany: vi.fn().mockResolvedValue([]) },
        plan: { create },
        recipe: { count: vi.fn().mockResolvedValue(1) },
        familyMember: { count: vi.fn().mockResolvedValue(0) },
        storedMealLot: {
          findMany: vi.fn().mockResolvedValue([{ id: "lot", recipeId: "batch-recipe", count: 1, version: 1, cookedAt: new Date(), audienceMembers: [], recipe: { name: "Soup" } }]),
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        storedMealEvent: { create: eventCreate },
      }),
    );
    const slot: SlotInputType = {
      date: new Date("2026-10-12T00:00:00.000Z"), mealType: PlannerMealType.DINNER,
      recipe: { id: "batch-recipe" } as SlotInputType["recipe"], customMeal: null,
      alternatives: [], used: false, isRolledOver: true, alreadyCooked: true, placementId: "client-id", batchGroupId: "batch-1",
    };
    await createPlan("user-1", slot.date, slot.date, [slot], [{ id: "batch-1", recipeId: "batch-recipe", storageRows: [{ count: 3, cookingFamilyMemberIds: [] }] }]);
    const data = create.mock.calls[0]![0].data;
    expect(data.slots.create[0]).toEqual(expect.objectContaining({ placementId: "client-id", alreadyCooked: true, batchGroupId: null }));
    expect(data.resolvedBatchRemainders.create).toEqual([{ batchId: "batch-1" }]);
    expect(data.batches.create[0].storageRows.create).toEqual([]);
    expect(eventCreate.mock.calls[0]![0].data.placementId).toBe("client-id");
  });

  it("keeps a partially transferred batch and its remainder", async () => {
    const create = vi.fn().mockResolvedValue({ id: "plan-1" });
    const eventCreate = vi.fn().mockResolvedValue({});
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      (callback as (tx: unknown) => Promise<unknown>)({
        $queryRaw: vi.fn(),
        logEntry: { findMany: vi.fn().mockResolvedValue([]) },
        plan: { create },
        recipe: { count: vi.fn().mockResolvedValue(1) },
        familyMember: { count: vi.fn().mockResolvedValue(0) },
        storedMealLot: {
          findMany: vi.fn().mockResolvedValue([{ id: "lot", recipeId: "batch-recipe", count: 1, version: 1, cookedAt: new Date(), audienceMembers: [], recipe: { name: "Soup" } }]),
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        storedMealEvent: { create: eventCreate },
      }),
    );
    const slot: SlotInputType = {
      date: new Date("2026-10-12T00:00:00.000Z"), mealType: PlannerMealType.DINNER,
      recipe: { id: "batch-recipe" } as SlotInputType["recipe"], customMeal: null,
      alternatives: [], used: false, isRolledOver: true, alreadyCooked: true,
      placementId: "first", batchGroupId: "batch-1",
    };
    await createPlan("user-1", slot.date, slot.date, [slot, { ...slot, mealType: PlannerMealType.LUNCH, placementId: "second", alreadyCooked: false }], [
      { id: "batch-1", recipeId: "batch-recipe", storageRows: [{ count: 3, cookingFamilyMemberIds: [] }] },
    ]);
    const data = create.mock.calls[0]![0].data;
    expect(data.slots.create).toEqual([
      expect.objectContaining({ placementId: "first", alreadyCooked: true, batchGroupId: null }),
      expect.objectContaining({ placementId: "second", alreadyCooked: false, batchGroupId: "batch-1" }),
    ]);
    expect(data.resolvedBatchRemainders.create).toEqual([]);
    expect(data.batches.create[0].storageRows.create).toHaveLength(1);
    expect(eventCreate).toHaveBeenCalledTimes(1);
  });

  it.each([true, undefined])("creates both flags with input %j, defaulting omitted values to false", async (flag) => {
    const create = vi.fn().mockResolvedValue({ id: "plan-1" });
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      (callback as (tx: unknown) => Promise<unknown>)({
        $queryRaw: vi.fn(),
        logEntry: { findMany: vi.fn().mockResolvedValue([]) },
        plan: { create },
        recipe: { count: vi.fn().mockResolvedValue(1) },
        storedMealLot: { findMany: vi.fn().mockResolvedValue([]) },
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
