import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlannerMealType } from "@/src/generated/client";
import type { SlotInputType } from "@/types/planner";
import { createPlan, deletePlanById, getPlanById, getPlanForGroceries, getUnusedRecipesFromLatestPlan } from "./planner";
import { prisma } from "./index";
import { deleteRollingPlanTx, ensureRollingLifecycleTx, syncRollingPlanTx } from "./rolling-meals";

vi.mock("./rolling-meals", () => ({
  ensureRollingLifecycleTx: vi.fn(), syncRollingPlanTx: vi.fn(),
  reconcileRollingBatchRemaindersTx: vi.fn(async (_tx, _userId, _planId, batches) => batches),
  verifyRollingBatchAssignmentsTx: vi.fn(), deleteRollingPlanTx: vi.fn(),
}));

vi.mock("./index", () => ({
  prisma: {
    $transaction: vi.fn(),
    plan: { findFirst: vi.fn() },
    familyMember: { findMany: vi.fn() },
    recipe: { updateMany: vi.fn() },
  },
}));

beforeEach(() => vi.resetAllMocks());

describe("plan deletion lifecycle", () => {
  it("cleans up lifecycle before deleting the owned plan in the locked transaction", async () => {
    const lock = vi.fn();
    const findFirst = vi.fn().mockResolvedValue({ id: "plan-1" });
    const remove = vi.fn();
    const tx = { $queryRaw: lock, plan: { findFirst, delete: remove } };
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      (callback as (tx: unknown) => Promise<unknown>)(tx),
    );
    await deletePlanById("user-1", "plan-1");
    expect(findFirst).toHaveBeenCalledWith({ where: { id: "plan-1", userId: "user-1" }, select: { id: true } });
    expect(deleteRollingPlanTx).toHaveBeenCalledExactlyOnceWith(tx, "user-1", "plan-1");
    expect(lock.mock.invocationCallOrder[0]).toBeLessThan(findFirst.mock.invocationCallOrder[0]!);
    expect(findFirst.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(deleteRollingPlanTx).mock.invocationCallOrder[0]!);
    expect(vi.mocked(deleteRollingPlanTx).mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0]!);
    expect(remove).toHaveBeenCalledWith({ where: { id: "plan-1" } });
  });

  it.each(["ownership", "lifecycle"])("does not delete when %s validation fails", async (failure) => {
    const remove = vi.fn();
    const tx = { $queryRaw: vi.fn(), plan: { findFirst: vi.fn().mockResolvedValue(failure === "ownership" ? null : { id: "plan-1" }), delete: remove } };
    if (failure === "lifecycle") vi.mocked(deleteRollingPlanTx).mockRejectedValueOnce(new Error("ROLLING_QUEUE_CONFLICT"));
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      (callback as (tx: unknown) => Promise<unknown>)(tx),
    );
    await expect(deletePlanById("user-1", "plan-1")).rejects.toThrow(failure === "ownership" ? "PLAN_NOT_FOUND" : "ROLLING_QUEUE_CONFLICT");
    expect(remove).not.toHaveBeenCalled();
    if (failure === "ownership") expect(deleteRollingPlanTx).not.toHaveBeenCalled();
  });
});

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
  it("syncs a moved custom claim with its original meal type after creating the plan under the user lock", async () => {
    const customMeal = { name: "Leftovers", ingredients: [] };
    const lock = vi.fn();
    const create = vi.fn().mockImplementation(async ({ data }) => ({ id: data.id }));
    const tx = {
      $queryRaw: lock, logEntry: { findMany: vi.fn().mockResolvedValue([]) },
      plan: { create },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      (callback as (tx: unknown) => Promise<unknown>)(tx),
    );
    const slot: SlotInputType = { date: new Date("2026-10-12T00:00:00.000Z"), mealType: PlannerMealType.DINNER,
      recipe: null, customMeal, alternatives: [], used: false, isRolledOver: true,
      rollingQueueClaim: { id: "queue", version: 1, mealType: PlannerMealType.LUNCH } };
    await createPlan("user-1", slot.date, slot.date, [slot]);
    const planId = create.mock.calls[0]![0].data.id;
    expect(ensureRollingLifecycleTx).toHaveBeenCalledExactlyOnceWith(tx, "user-1");
    expect(lock.mock.calls[0]![0].join("?")).toBe("SELECT id FROM users WHERE id = ? FOR UPDATE");
    expect(lock.mock.calls[0]![1]).toBe("user-1");
    expect(lock.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(ensureRollingLifecycleTx).mock.invocationCallOrder[0]!);
    expect(vi.mocked(ensureRollingLifecycleTx).mock.invocationCallOrder[0]).toBeLessThan(create.mock.invocationCallOrder[0]!);
    expect(syncRollingPlanTx).toHaveBeenCalledExactlyOnceWith(tx, "user-1", planId, [expect.objectContaining({
      mealType: PlannerMealType.DINNER, customMeal, rollingQueueClaim: slot.rollingQueueClaim,
      placementId: expect.any(String),
    })], [], { create: true, startDate: slot.date, convertedBatchIds: [], resolvedBatchIds: [] });
    expect(create.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(syncRollingPlanTx).mock.invocationCallOrder[0]!);
  });

  it("passes explicit rolling claims to lifecycle sync instead of substituting cooked lots", async () => {
    const create = vi.fn().mockResolvedValue({ id: "plan-1" });
    const lotDelete = vi.fn().mockResolvedValue({ count: 1 });
    const findLots = vi.fn().mockResolvedValue([{ id: "lot", recipeId: "batch-recipe", count: 1, version: 1, cookedAt: new Date(), audienceMembers: [], recipe: { name: "Soup" } }]);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      (callback as (tx: unknown) => Promise<unknown>)({
        $queryRaw: vi.fn(),
        logEntry: { findMany: vi.fn().mockResolvedValue([]) },
        plan: { create }, recipe: { count: vi.fn().mockResolvedValue(1) },
        familyMember: { count: vi.fn().mockResolvedValue(0) },
        storedMealLot: { findMany: findLots, deleteMany: lotDelete },
        storedMealEvent: { create: vi.fn() },
      }),
    );
    const slot: SlotInputType = { date: new Date("2026-10-12T00:00:00.000Z"), mealType: PlannerMealType.DINNER,
      recipe: { id: "batch-recipe" } as SlotInputType["recipe"], customMeal: null, alternatives: [], used: false,
      isRolledOver: true, placementId: "first", batchGroupId: "batch", rollingQueueClaim: { id: "queue", version: 2 } };
    await createPlan("user-1", slot.date, slot.date, [slot, { ...slot, mealType: PlannerMealType.LUNCH, placementId: "second" }], [
      { id: "batch", recipeId: "batch-recipe", rollingQueueClaim: slot.rollingQueueClaim, storageRows: [{ count: 2, cookingFamilyMemberIds: [] }] },
    ]);
    expect(findLots).not.toHaveBeenCalled();
    expect(lotDelete).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledOnce();
    expect(syncRollingPlanTx).toHaveBeenCalledWith(expect.anything(), "user-1", expect.any(String), [
      expect.objectContaining({ placementId: "first", rollingQueueClaim: slot.rollingQueueClaim, batchGroupId: "batch" }),
      expect.objectContaining({ placementId: "second", rollingQueueClaim: slot.rollingQueueClaim, batchGroupId: "batch" }),
    ], [expect.objectContaining({ rollingQueueClaim: slot.rollingQueueClaim, storageRows: [{ count: 2, cookingFamilyMemberIds: [] }] })],
    expect.objectContaining({ resolvedBatchIds: [] }));
  });

  it("propagates lifecycle claim failure out of the create transaction", async () => {
    const create = vi.fn().mockResolvedValue({ id: "plan-1" });
    vi.mocked(syncRollingPlanTx).mockRejectedValueOnce(new Error("ROLLING_QUEUE_CONFLICT"));
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      (callback as (tx: unknown) => Promise<unknown>)({
        $queryRaw: vi.fn(), logEntry: { findMany: vi.fn().mockResolvedValue([]) }, plan: { create },
        storedMealLot: { findMany: vi.fn().mockResolvedValue([]) },
      }),
    );
    const slot: SlotInputType = { date: new Date("2026-10-12T00:00:00.000Z"), mealType: PlannerMealType.DINNER,
      recipe: { id: "r" } as SlotInputType["recipe"], customMeal: null, alternatives: [], used: false,
      isRolledOver: true, rollingQueueClaim: { id: "queue", version: 2 } };
    await expect(createPlan("user-1", slot.date, slot.date, [slot])).rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    expect(create).toHaveBeenCalledOnce();
    expect(prisma.recipe.updateMany).not.toHaveBeenCalled();
  });

  it("does not initialize or sync lifecycle when the date conflicts", async () => {
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
    expect(ensureRollingLifecycleTx).not.toHaveBeenCalled();
    expect(syncRollingPlanTx).not.toHaveBeenCalled();
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
    expect(syncRollingPlanTx).toHaveBeenCalledWith(expect.anything(), "user-1", expect.any(String), [
      expect.objectContaining({ placementId: "client-id", alreadyCooked: true, batchGroupId: null }),
    ], expect.any(Array), { create: true, startDate: slot.date, convertedBatchIds: [], resolvedBatchIds: ["batch-1"] });
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
    expect(syncRollingPlanTx).toHaveBeenCalledWith(expect.anything(), "user-1", expect.any(String), [
      expect.objectContaining({ placementId: "first", alreadyCooked: true, batchGroupId: null }),
      expect.objectContaining({ placementId: "second", alreadyCooked: false, batchGroupId: "batch-1" }),
    ], expect.any(Array), { create: true, startDate: slot.date, convertedBatchIds: [], resolvedBatchIds: [] });
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
