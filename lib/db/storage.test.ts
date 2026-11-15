import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "./index";
import { adjustStoredMealLot, removeStoredMealQuantity } from "./storage";

vi.mock("./index", () => ({ prisma: { $transaction: vi.fn(), familyMember: { count: vi.fn() } } }));

const tx = {
  storedMealLot: {
    findFirst: vi.fn(),
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  storedMealEvent: { create: vi.fn() },
};

const existing = {
  id: "lot",
  count: 3,
  version: 2,
  recipeId: "recipe",
  recipe: { name: "Soup" },
};
const input = { lotId: "lot", expectedVersion: 2, quantity: 3, reason: "USED" as const };

describe("adjustStoredMealLot to zero", () => {
  const adjustment = { lotId: "lot", expectedVersion: 2, count: 0, cookingFamilyMemberIds: ["member"] };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.familyMember.count).mockResolvedValue(1);
    vi.mocked(prisma.$transaction).mockImplementation(
      (async (callback: (client: typeof tx) => unknown) => callback(tx)) as never,
    );
    tx.storedMealLot.findFirst.mockResolvedValue(existing);
    tx.storedMealLot.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("deletes the lot and records an adjusted snapshot in the transaction", async () => {
    await expect(adjustStoredMealLot("user", adjustment)).resolves.toEqual({ type: "success", lot: null });
    expect(tx.storedMealLot.deleteMany).toHaveBeenCalledWith({
      where: { id: "lot", userId: "user", version: 2, count: 3 },
    });
    expect(tx.storedMealEvent.create).toHaveBeenCalledWith({
      data: { userId: "user", recipeId: "recipe", recipeName: "Soup", type: "ADJUSTED", quantity: 3, previousCount: 3, nextCount: 0 },
    });
    expect(tx.storedMealLot.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(tx.storedMealEvent.create.mock.invocationCallOrder[0]);
    expect(tx.storedMealLot.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a stale version without writing", async () => {
    tx.storedMealLot.findFirst.mockResolvedValue({ ...existing, version: 3 });
    await expect(adjustStoredMealLot("user", adjustment)).resolves.toEqual({ type: "conflict" });
    expect(tx.storedMealLot.deleteMany).not.toHaveBeenCalled();
    expect(tx.storedMealEvent.create).not.toHaveBeenCalled();
  });

  it("returns a conflict without an event when the conditional delete loses a race", async () => {
    tx.storedMealLot.deleteMany.mockResolvedValue({ count: 0 });
    await expect(adjustStoredMealLot("user", adjustment)).resolves.toEqual({ type: "conflict" });
    expect(tx.storedMealEvent.create).not.toHaveBeenCalled();
  });
});

describe("removeStoredMealQuantity", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(
      (async (callback: (client: typeof tx) => unknown) => callback(tx)) as never,
    );
    tx.storedMealLot.findFirst.mockResolvedValue(existing);
    tx.storedMealLot.deleteMany.mockResolvedValue({ count: 1 });
    tx.storedMealLot.updateMany.mockResolvedValue({ count: 1 });
  });

  it("compares version and count before deleting and creates the event afterward", async () => {
    await expect(removeStoredMealQuantity("user", input)).resolves.toEqual({ type: "success", lot: null });

    expect(tx.storedMealLot.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "lot", userId: "user" } }));
    expect(tx.storedMealLot.deleteMany).toHaveBeenCalledWith({
      where: { id: "lot", userId: "user", version: 2, count: 3 },
    });
    expect(tx.storedMealEvent.create).toHaveBeenCalledWith({
      data: { userId: "user", recipeId: "recipe", recipeName: "Soup", type: "USED", quantity: 3, previousCount: 3, nextCount: 0 },
    });
    expect(tx.storedMealLot.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(tx.storedMealEvent.create.mock.invocationCallOrder[0]);
    expect(tx.storedMealLot.updateMany).not.toHaveBeenCalled();
  });

  it("returns a conflict without an event when the conditional delete loses a race", async () => {
    tx.storedMealLot.deleteMany.mockResolvedValue({ count: 0 });

    await expect(removeStoredMealQuantity("user", input)).resolves.toEqual({ type: "conflict" });
    expect(tx.storedMealEvent.create).not.toHaveBeenCalled();
  });

  it.each([
    { version: 3, count: 3 },
    { version: 2, count: 2 },
  ])("rejects stale version or insufficient count without writing", async ({ version, count }) => {
    tx.storedMealLot.findFirst.mockResolvedValue({ ...existing, version, count });

    await expect(removeStoredMealQuantity("user", input)).resolves.toEqual({ type: "conflict" });
    expect(tx.storedMealLot.deleteMany).not.toHaveBeenCalled();
    expect(tx.storedMealLot.updateMany).not.toHaveBeenCalled();
    expect(tx.storedMealEvent.create).not.toHaveBeenCalled();
  });

  it("decrements a partial quantity and returns the updated lot", async () => {
    const lot = {
      id: "lot", count: 2, version: 3, cookedAt: new Date("2026-01-01"),
      recipe: { id: "recipe", name: "Soup", slug: "soup", archivedAt: null, excludeFromPlanner: false },
      audienceMembers: [{ familyMember: { id: "member", name: "Alex" } }],
      sourcePlan: null,
    };
    tx.storedMealLot.findUniqueOrThrow.mockResolvedValue(lot);

    await expect(removeStoredMealQuantity("user", { ...input, quantity: 1 })).resolves.toEqual({
      type: "success",
      lot: { id: lot.id, count: 2, version: 3, cookedAt: lot.cookedAt, recipe: lot.recipe, audience: [{ id: "member", name: "Alex" }], sourcePlan: null },
    });
    expect(tx.storedMealLot.updateMany).toHaveBeenCalledWith({
      where: { id: "lot", userId: "user", version: 2, count: { gte: 1 } },
      data: { count: { decrement: 1 }, version: { increment: 1 } },
    });
    expect(tx.storedMealEvent.create).toHaveBeenCalledWith({
      data: { userId: "user", lotId: "lot", recipeId: "recipe", recipeName: "Soup", type: "USED", quantity: 1, previousCount: 3, nextCount: 2 },
    });
    expect(tx.storedMealLot.deleteMany).not.toHaveBeenCalled();
  });
});
