import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "./index";
import { adjustRollingMeal, captureUncapturedPlansForRolling, discardRollingMealQuantity, ensureRollingQueueInitialized, listRollingMealQueue } from "./rolling-meals";

vi.mock("./index", () => ({ prisma: { $transaction: vi.fn(), rollingMealEntry: { findMany: vi.fn() } } }));

const tx = {
  $queryRaw: vi.fn(),
  rollingQueueState: { findUnique: vi.fn(), create: vi.fn() },
  rollingCapturedPlan: { createMany: vi.fn() },
  rollingMealEntry: { createMany: vi.fn(), deleteMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
  plan: { findMany: vi.fn() },
};
const slot = (used: boolean) => ({ used, alreadyCooked: false, isRolledOver: false, batchGroupId: null, recipeId: "r", recipe: { archivedAt: null, excludeFromPlanner: false } });
const plan = (id: string, slots: object[], batches: object[] = [], resolvedBatchRemainders: object[] = []) => ({ id, slots, batches, resolvedBatchRemainders });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((async (fn: (client: typeof tx) => unknown) => fn(tx)) as never);
  tx.rollingMealEntry.deleteMany.mockResolvedValue({ count: 1 });
  tx.rollingMealEntry.updateMany.mockResolvedValue({ count: 1 });
});

describe("rolling capture", () => {
  it("reads the queue without initializing or capturing plans", async () => {
    vi.mocked(prisma.rollingMealEntry.findMany).mockResolvedValue([]);
    await expect(listRollingMealQueue("u")).resolves.toEqual([]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.rollingMealEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u" } }));
  });

  it("uses a fully used newest identity as a barrier and marks all historical plans captured", async () => {
    tx.rollingQueueState.findUnique.mockResolvedValue(null);
    tx.plan.findMany.mockResolvedValueOnce([{ id: "new" }, { id: "old" }, { id: "older" }]).mockResolvedValueOnce([
      plan("new", [slot(true)]),
      plan("old", [slot(false)]),
    ]);
    await ensureRollingQueueInitialized("u");
    expect(tx.plan.findMany.mock.calls[1][0]).toMatchObject({ where: { userId: "u", id: { in: ["new", "old", "older"] } } });
    expect(tx.rollingMealEntry.createMany).not.toHaveBeenCalled();
    expect(tx.rollingMealEntry.deleteMany).not.toHaveBeenCalled();
    expect(tx.rollingCapturedPlan.createMany).toHaveBeenCalledWith({ data: [
      { planId: "new", userId: "u" }, { planId: "old", userId: "u" }, { planId: "older", userId: "u" },
    ] });
  });

  it("only inserts missing identities and leaves existing counts and versions untouched", async () => {
    tx.rollingQueueState.findUnique.mockResolvedValue({ userId: "u" });
    tx.plan.findMany.mockResolvedValue([plan("p", [slot(false), slot(false)])]);
    await captureUncapturedPlansForRolling("u");
    expect(tx.plan.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u", rollingCapture: null } }));
    expect(tx.rollingMealEntry.createMany).toHaveBeenCalledWith({
      data: [{ userId: "u", identity: "recipe:r", recipeId: "r", count: 2 }], skipDuplicates: true,
    });
    expect(tx.rollingMealEntry.updateMany).not.toHaveBeenCalled();
    expect(tx.rollingMealEntry.deleteMany).not.toHaveBeenCalled();
    expect(tx.rollingCapturedPlan.createMany).toHaveBeenCalledWith({ data: [{ planId: "p", userId: "u" }] });
  });

  it("batches distinct identities across plans while preserving newest identity barriers", async () => {
    tx.rollingQueueState.findUnique.mockResolvedValue({ userId: "u" });
    const custom = { used: false, alreadyCooked: false, recipeId: null, mealType: "DINNER", customName: "Soup", customIngredients: [] };
    tx.plan.findMany.mockResolvedValue([
      plan("new", [slot(false), { ...slot(true), recipeId: "blocked" }, custom]),
      plan("old", [slot(false), { ...slot(false), recipeId: "blocked" }, { ...slot(false), recipeId: "other" }, custom]),
    ]);
    await captureUncapturedPlansForRolling("u");
    expect(tx.rollingMealEntry.createMany).toHaveBeenCalledTimes(1);
    expect(tx.rollingMealEntry.createMany).toHaveBeenCalledWith({
      data: [
        { userId: "u", identity: "recipe:r", recipeId: "r", count: 1 },
        expect.objectContaining({ userId: "u", count: 1, mealType: "DINNER", customMeal: { name: "Soup", ingredients: [] } }),
        { userId: "u", identity: "recipe:other", recipeId: "other", count: 1 },
      ],
      skipDuplicates: true,
    });
  });

  it("groups custom meals by normalized content and meal type", async () => {
    tx.rollingQueueState.findUnique.mockResolvedValue({ userId: "u" });
    const custom = { used: false, alreadyCooked: false, isRolledOver: false, recipeId: null, mealType: "DINNER", customName: " Soup ", customIngredients: [] };
    tx.plan.findMany.mockResolvedValue([plan("p", [custom, { ...custom, customName: "soup" }])]);
    await captureUncapturedPlansForRolling("u");
    expect(tx.rollingMealEntry.createMany).toHaveBeenCalledTimes(1);
    expect(tx.rollingMealEntry.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ count: 2, mealType: "DINNER", customMeal: { name: " Soup ", ingredients: [] } })],
    }));
  });

  it("does not seed cooked slots or resolved remainders", async () => {
    tx.rollingQueueState.findUnique.mockResolvedValue({ userId: "u" });
    const batch = { id: "b", recipeId: "r", recipe: { archivedAt: null, excludeFromPlanner: false }, storageRows: [{ count: 4 }] };
    tx.plan.findMany.mockResolvedValue([
      plan("new", [{ ...slot(false), alreadyCooked: true }, { ...slot(true), isRolledOver: true }], [batch], [{ batchId: "b" }]),
      plan("old", [slot(false)]),
    ]);
    await captureUncapturedPlansForRolling("u");
    expect(tx.rollingMealEntry.createMany).not.toHaveBeenCalled();
    expect(tx.rollingMealEntry.deleteMany).not.toHaveBeenCalled();
  });

  it("seeds only uncooked counts and excludes resolved remainders during initialization", async () => {
    tx.rollingQueueState.findUnique.mockResolvedValue(null);
    const batch = { id: "b", recipeId: "r", recipe: { archivedAt: null, excludeFromPlanner: false }, storageRows: [{ count: 4 }] };
    tx.plan.findMany.mockResolvedValueOnce([{ id: "p" }]).mockResolvedValueOnce([
      plan("p", [slot(false), { ...slot(false), alreadyCooked: true }], [batch], [{ batchId: "b" }]),
    ]);
    await ensureRollingQueueInitialized("u");
    expect(tx.rollingMealEntry.createMany).toHaveBeenCalledWith({
      data: [{ userId: "u", identity: "recipe:r", recipeId: "r", count: 1 }], skipDuplicates: true,
    });
  });

  it("seeds unused rolled-over placements and unresolved batch remainders", async () => {
    tx.rollingQueueState.findUnique.mockResolvedValue({ userId: "u" });
    const batch = { id: "b", recipeId: "r", recipe: { archivedAt: null, excludeFromPlanner: false }, storageRows: [{ count: 2 }] };
    tx.plan.findMany.mockResolvedValue([plan("p", [{ ...slot(false), isRolledOver: true, batchGroupId: "b" }], [batch])]);
    await captureUncapturedPlansForRolling("u");
    expect(tx.rollingMealEntry.createMany).toHaveBeenCalledWith({
      data: [{ userId: "u", identity: "recipe:r", recipeId: "r", count: 3 }], skipDuplicates: true,
    });
  });

  it("seeds unused rolled-over custom meals", async () => {
    tx.rollingQueueState.findUnique.mockResolvedValue({ userId: "u" });
    const custom = { used: false, alreadyCooked: false, isRolledOver: true, recipeId: null, mealType: "DINNER", customName: "Soup", customIngredients: [] };
    tx.plan.findMany.mockResolvedValue([plan("p", [custom])]);
    await captureUncapturedPlansForRolling("u");
    expect(tx.rollingMealEntry.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ count: 1, mealType: "DINNER", customMeal: { name: "Soup", ingredients: [] } })],
    }));
  });
});

describe("queue mutations", () => {
  const entry = { id: "e", count: 3, version: 2, recipeId: "r", recipe: { name: "Soup" }, mealType: null, customMeal: null };
  it("checks ownership and version when adjusting", async () => {
    tx.rollingMealEntry.findFirst.mockResolvedValue(entry);
    await expect(adjustRollingMeal("u", { entryId: "e", expectedVersion: 2, count: 5 })).resolves.toEqual({
      type: "success", entry: { id: "e", version: 3, count: 5, name: "Soup", kind: "recipe", recipeId: "r" },
    });
    expect(tx.rollingMealEntry.updateMany).toHaveBeenCalledWith({ where: { id: "e", userId: "u", version: 2 }, data: { count: 5, version: { increment: 1 } } });
  });
  it("rejects stale versions and excessive discards", async () => {
    tx.rollingMealEntry.findFirst.mockResolvedValue(entry);
    await expect(discardRollingMealQuantity("u", { entryId: "e", expectedVersion: 1, quantity: 1 })).resolves.toEqual({ type: "conflict" });
    await expect(discardRollingMealQuantity("u", { entryId: "e", expectedVersion: 2, quantity: 4 })).resolves.toEqual({ type: "conflict" });
    expect(tx.rollingMealEntry.updateMany).not.toHaveBeenCalled();
  });
  it("deletes at zero and reports missing entries", async () => {
    tx.rollingMealEntry.findFirst.mockResolvedValueOnce(entry).mockResolvedValueOnce(null);
    await expect(discardRollingMealQuantity("u", { entryId: "e", expectedVersion: 2, quantity: 3 })).resolves.toEqual({ type: "success", entry: null });
    await expect(adjustRollingMeal("other", { entryId: "e", expectedVersion: 2, count: 1 })).resolves.toEqual({ type: "not_found" });
  });
});
