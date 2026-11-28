import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma, RollingMealUnit } from "@/src/generated/client";
import { prisma } from "./index";
import {
  adjustRollingMeal, deleteRollingPlanTx, discardRollingMealQuantity,
  ensureRollingLifecycleTx, listRollingMealQueue, RollingMigrationRequiredError, syncRollingPlanTx,
  listPlannedStorageMeals, reconcileRollingBatchRemaindersTx, verifyRollingBatchAssignmentsTx,
  type RollingPlanBatch, type RollingPlanSlot,
} from "./rolling-meals";

vi.mock("./index", () => ({ prisma: { $transaction: vi.fn() } }));

type Group = {
  id: string; userId: string; identity: string; count: number; version: number;
  recipeId: string | null; mealType: string | null; customMeal: unknown;
};
type Mapping = { planId: string; placementId: string; unitId: string; batchId: string | null };
let groups: Group[];
let units: RollingMealUnit[];
let mappings: Mapping[];
let plans: { id: string; userId: string; startDate: Date; endDate: Date; resolvedBatchRemainders?: { batchId: string }[] }[];
let state: { userId: string; lifecycleVersion: number } | null;
let sequence: number;
const copy = <T>(value: T): T => structuredClone(value);
function matchesUnit(unit: RollingMealUnit, where: Record<string, unknown> = {}) {
  return Object.entries(where).every(([key, value]) => unit[key as keyof RollingMealUnit] === value);
}
const tx = {
  $queryRaw: vi.fn(),
  rollingQueueState: {
    findUnique: vi.fn(async () => state),
    create: vi.fn(async ({ data }) => { state = data; return data; }),
  },
  rollingCapturedPlan: { findFirst: vi.fn(async () => null) },
  plan: {
    findFirst: vi.fn(async ({ where }) => plans.find((plan) => plan.userId === where.userId && (!where.id || plan.id === where.id)) ?? null),
    findMany: vi.fn(async ({ where }) => plans.filter((plan) => plan.userId === where.userId && plan.id !== where.id?.not && plan.endDate < where.endDate.lt)),
  },
  recipe: { findFirst: vi.fn(async ({ where }) => where.userId === "u" && where.id === "r" ? { id: "r" } : null) },
  rollingMealEntry: {
    findFirst: vi.fn(async ({ where, select }) => {
      const group = groups.find((entry) => entry.userId === where.userId && (!where.id || entry.id === where.id));
      const owned = units.filter((unit) => unit.entryId === group?.id);
      return group ? { ...copy(group), recipe: group.recipeId ? { name: "Pancake" } : null,
        units: owned.filter((unit) => matchesUnit(unit, select.units?.where)),
        _count: { units: owned.filter((unit) => matchesUnit(unit, select._count?.select.units.where)).length },
      } : null;
    }),
    findMany: vi.fn(async ({ where, select }) => groups.filter((entry) => entry.userId === where.userId &&
      (!where.units || units.some((unit) => unit.entryId === entry.id && matchesUnit(unit, where.units.some)))).map((entry) => ({
      ...copy(entry), units: copy(units.filter((unit) => unit.entryId === entry.id && matchesUnit(unit, select?.units?.where))),
      recipe: entry.recipeId ? { name: "Pancake" } : null,
      _count: { units: select?._count ? units.filter((unit) => unit.entryId === entry.id && unit.state === select._count.select.units.where.state &&
        (!select._count.select.units.where.eligible || unit.eligible) &&
        (!select._count.select.units.where.OR || unit.currentPlanId === null ||
          select._count.select.units.where.OR[1].currentPlanId.in.includes(unit.currentPlanId))).length : 0 },
    }))),
    create: vi.fn(async ({ data }) => {
      const entry = { id: `e${++sequence}`, version: 1, recipeId: null, mealType: null, customMeal: null, ...data };
      groups.push(entry);
      return { ...copy(entry), units: [] };
    }),
    update: vi.fn(async ({ where, data }) => {
      const entry = groups.find((candidate) => candidate.id === where.id)!;
      entry.count = data.count;
      entry.version += data.version.increment;
      return copy(entry);
    }),
  },
  rollingMealUnit: {
    count: vi.fn(async ({ where }) => units.filter((unit) => unit.entryId === where.entryId && unit.state === where.state && unit.eligible === where.eligible).length),
    create: vi.fn(async ({ data }) => { units.push(copy(data)); return data; }),
    update: vi.fn(async ({ where, data }) => { Object.assign(units.find((unit) => unit.id === where.id)!, copy(data)); }),
    findMany: vi.fn(async ({ where, take }) => copy(units.filter((unit) => unit.entryId === where.entryId && unit.state === where.state &&
      unit.eligible === where.eligible && unit.currentPlanId === null).slice(0, take))),
    updateMany: vi.fn(async ({ where, data }) => {
      units.filter((unit) => where.id.in.includes(unit.id)).forEach((unit) => Object.assign(unit, data));
    }),
    createMany: vi.fn(async ({ data }) => {
      for (const row of data) units.push({ id: `adjust${++sequence}`, state: "PENDING", currentPlanId: null, placementId: null,
        batchId: null, sourcePlanId: null, sourcePlacementId: null, createdAt: new Date(), completedAt: null, ...row });
    }),
  },
  rollingMealPlacement: {
    findMany: vi.fn(async ({ where, include }) => copy(mappings.filter((mapping) => mapping.planId === where.planId &&
      (!where.batchId || where.batchId.in.includes(mapping.batchId))).map((mapping) => ({
        ...mapping, ...(include?.unit ? { unit: units.find((unit) => unit.id === mapping.unitId) } : {}),
      })))),
    upsert: vi.fn(async ({ where, create, update }) => {
      const key = where.planId_placementId;
      const mapping = mappings.find((row) => row.planId === key.planId && row.placementId === key.placementId);
      if (mapping) Object.assign(mapping, update);
      else mappings.push(copy(create));
    }),
  },
};
const client = tx as unknown as Prisma.TransactionClient;
const slot = (placementId: string, overrides: Partial<RollingPlanSlot> = {}): RollingPlanSlot => ({
  placementId, recipeId: "r", mealType: "DINNER", used: false, ...overrides,
});
const batch = (count: number, overrides: Partial<RollingPlanBatch> = {}): RollingPlanBatch => ({
  id: "b", recipeId: "r", storageRows: [{ count, cookingFamilyMemberIds: ["member"] }], ...overrides,
});
const sync = (planId: string, slots: RollingPlanSlot[], batches: RollingPlanBatch[] = [], options = {}) =>
  syncRollingPlanTx(client, "u", planId, slots, batches, options);
const token = () => ({ id: groups[0].id, version: groups[0].version });
const pending = () => units.filter((unit) => unit.state === "PENDING");

beforeEach(() => {
  vi.clearAllMocks();
  groups = []; units = []; mappings = []; sequence = 0;
  state = { userId: "u", lifecycleVersion: 1 };
  plans = [1, 2, 3].map((week) => ({ id: `p${week}`, userId: "u", startDate: new Date(2026, 0, week * 7), endDate: new Date(2026, 0, week * 7 + 6) }));
  vi.mocked(prisma.$transaction).mockImplementation((async (fn: (tx: Prisma.TransactionClient) => unknown) => fn(client)) as never);
});

describe("lifecycle guard and reads", () => {
  it("shows the planner total but adjusts only unassigned meals, not slots or batch remainders", async () => {
    await sync("p1", [slot("a", { batchGroupId: "b" }), slot("released"), slot("done", { used: true })], [batch(1)]);
    await sync("p1", [slot("a", { batchGroupId: "b" }), slot("done", { used: true })], [batch(1)]);
    await sync("p2", [slot("fresh")], [], { create: true });
    const assigned = copy(units.filter((unit) => unit.currentPlanId));
    const input = { entryId: token().id, expectedVersion: token().version };
    await expect(listPlannedStorageMeals("u")).resolves.toMatchObject({ latest: [{ count: 2, unassignedCount: 0 }], earlier: [{ count: 1, unassignedCount: 0 }], unscheduled: [{ count: 1, unassignedCount: 1 }] });
    await expect(discardRollingMealQuantity("u", { ...input, quantity: 2 })).resolves.toEqual({ type: "conflict" });
    await expect(adjustRollingMeal("u", { ...input, count: 3 })).resolves.toMatchObject({ entry: { count: 6, unassignedCount: 3 } });
    await expect(adjustRollingMeal("u", { ...input, count: 0 })).resolves.toEqual({ type: "conflict" });
    await expect(adjustRollingMeal("u", { ...input, expectedVersion: token().version, count: 0 })).resolves.toMatchObject({ entry: { count: 3, unassignedCount: 0 } });
    expect(units.filter((unit) => unit.currentPlanId)).toEqual(assigned);
  });
  it("blocks legacy state, plans without state, and legacy entries", async () => {
    state = { userId: "u", lifecycleVersion: 0 };
    await expect(ensureRollingLifecycleTx(client, "u")).rejects.toBeInstanceOf(RollingMigrationRequiredError);
    state = null;
    await expect(listRollingMealQueue("u")).rejects.toThrow("ROLLING_MIGRATION_REQUIRED");
    plans = [];
    groups.push({ id: "legacy", userId: "u", identity: "recipe:r", recipeId: "r", count: 2, version: 1, mealType: null, customMeal: null });
    await expect(ensureRollingLifecycleTx(client, "u")).rejects.toThrow("ROLLING_MIGRATION_REQUIRED");
    expect(tx.rollingQueueState.create).not.toHaveBeenCalled();
  });

  it("returns empty for a new account without writing, initializes only on explicit guarded write", async () => {
    state = null; plans = [];
    await expect(listRollingMealQueue("u")).resolves.toEqual([]);
    expect(tx.rollingQueueState.create).not.toHaveBeenCalled();
    await ensureRollingLifecycleTx(client, "u");
    expect(state).toEqual({ userId: "u", lifecycleVersion: 1 });
  });

  it("never recaptures snapshots and previews current fresh units without changing eligibility", async () => {
    await sync("p1", [slot("a")]);
    const version = groups[0].version;
    await ensureRollingLifecycleTx(client, "u");
    await expect(listRollingMealQueue("u")).resolves.toEqual([]);
    await expect(listRollingMealQueue("u", { includeCurrent: true })).resolves.toMatchObject([{ count: 1, version }]);
    expect(units[0].eligible).toBe(false);
    expect(groups[0].count).toBe(0);
    expect(tx.plan.findMany).toHaveBeenCalledExactlyOnceWith({
      where: { userId: "u", id: { not: "p1" }, endDate: { lt: plans[0].startDate } }, select: { id: true },
    });
  });

  it("date-bounds preview to preceding plans and unassigned backlog without writes", async () => {
    await sync("p1", [slot("past")]);
    await sync("p3", [slot("future")]);
    await adjustRollingMeal("u", { entryId: token().id, expectedVersion: token().version, count: 2 });
    vi.clearAllMocks();
    const beforeDate = plans[1].startDate;
    await expect(listRollingMealQueue("u", { includeCurrent: true, beforeDate })).resolves.toMatchObject([{ count: 3 }]);
    await expect(listRollingMealQueue("u", { beforeDate })).resolves.toMatchObject([{ count: 2 }]);
    await expect(listRollingMealQueue("u", { includeCurrent: true })).resolves.toMatchObject([{ count: 4 }]);
    expect(tx.rollingMealEntry.update).not.toHaveBeenCalled();
    expect(tx.rollingMealUnit.update).not.toHaveBeenCalled();
    expect(tx.rollingQueueState.create).not.toHaveBeenCalled();
    expect(units.filter((unit) => unit.eligible)).toHaveLength(2);
  });

  it("excludes overlapping and future assigned units even if already eligible", async () => {
    plans[0].endDate = plans[1].startDate;
    await sync("p1", [slot("overlap")]);
    await sync("p3", [slot("future")]);
    units.forEach((unit) => { unit.eligible = true; });
    await expect(listRollingMealQueue("u", { includeCurrent: true, beforeDate: plans[1].startDate })).resolves.toEqual([]);
    await expect(listRollingMealQueue("u", { beforeDate: plans[1].startDate })).resolves.toEqual([]);
  });
});

describe("durable assignments", () => {
  it("moves one pancake through three plans, completes once, and ignores historical saves", async () => {
    await sync("p1", [slot("a")]);
    const id = units[0].id;
    await sync("p2", [slot("b", { rollingQueueClaim: token() })], [], { create: true });
    await sync("p3", [slot("c", { rollingQueueClaim: token() })], [], { create: true });
    expect(pending()).toHaveLength(1);
    expect(units[0].id).toBe(id);
    expect(groups[0].count).toBe(1);
    await sync("p1", [slot("a", { used: true })]);
    expect(pending()).toHaveLength(1);
    await sync("p3", [slot("c", { used: true })]);
    const version = groups[0].version;
    await sync("p3", [slot("c", { used: true })]);
    await sync("p1", [slot("a")]);
    expect(pending()).toHaveLength(0);
    expect(groups[0]).toMatchObject({ count: 0, version });
    expect(mappings).toHaveLength(3);
  });

  it("completes only one of three units and keeps same-recipe fresh units independent", async () => {
    await sync("p1", [slot("a"), slot("b"), slot("c")]);
    await sync("p2", [slot("d", { rollingQueueClaim: token() }), slot("fresh")], [], { create: true });
    expect(pending()).toHaveLength(4);
    await sync("p2", [slot("d", { used: true }), slot("fresh")]);
    expect(pending()).toHaveLength(3);
    expect(groups[0].count).toBe(2);
  });

  it("rejects stale, wrong-identity, cross-user and already-cooked claims", async () => {
    await sync("p1", [slot("a")]);
    const stale = { ...token(), version: 0 };
    await expect(sync("p2", [slot("b", { rollingQueueClaim: stale })])).rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    await expect(sync("p2", [slot("b", { alreadyCooked: true, rollingQueueClaim: token() })])).rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    await expect(sync("p2", [slot("b", { recipeId: "foreign", rollingQueueClaim: token() })])).rejects.toThrow("ROLLING_INVALID_IDENTITY");
    await expect(sync("foreign-plan", [])).rejects.toThrow("ROLLING_PLAN_NOT_FOUND");
    expect(units).toHaveLength(1);
  });

  it("saves a new draft with an older claim when enough eligible portions still exist", async () => {
    await sync("p1", [slot("a"), slot("b")]);
    const claim = token();
    const remainingId = units.find((unit) => unit.placementId === "b")!.id;
    await sync("p1", [slot("a", { used: true }), slot("b")]);
    expect(token().version).toBeGreaterThan(claim.version);

    await sync("p2", [slot("destination", { rollingQueueClaim: claim })], [], { create: true });

    expect(pending()).toHaveLength(1);
    expect(pending()[0]).toMatchObject({ id: remainingId, currentPlanId: "p2" });
    expect(units.find((unit) => unit.placementId === "a")?.state).toBe("COMPLETED");
  });

  it("still rejects an older claim when its last portion has been completed", async () => {
    await sync("p1", [slot("a")]);
    const claim = token();
    await sync("p1", [slot("a", { used: true })]);

    await expect(sync("p2", [slot("destination", { rollingQueueClaim: claim })], [], { create: true }))
      .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    expect(pending()).toHaveLength(0);
    expect(units).toHaveLength(1);
  });

  it("rejects historical identity replacement instead of saving it untracked", async () => {
    await sync("p1", [slot("a")]);
    await sync("p2", [slot("b", { rollingQueueClaim: token() })]);
    await expect(sync("p1", [slot("a", { recipeId: null, customMeal: { name: "Replacement", ingredients: [] } })]))
      .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    await sync("p1", [slot("a", { used: true })]);
    expect(pending()).toHaveLength(1);
    expect(groups).toHaveLength(1);
    expect(units[0].currentPlanId).toBe("p2");
  });

  it("rejects future and overlapping source claims when creating a plan", async () => {
    await sync("p3", [slot("future")]);
    await expect(sync("p2", [slot("b", { rollingQueueClaim: token() })], [], { create: true, startDate: plans[1].startDate }))
      .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    expect(units[0].currentPlanId).toBe("p3");
    plans[2].endDate = plans[1].startDate;
    await expect(sync("p2", [], [batch(1, { rollingQueueClaim: token() })], { create: true, startDate: plans[1].startDate }))
      .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    plans[2].endDate = new Date(plans[1].startDate.getTime() - 1);
    await sync("p2", [slot("b", { rollingQueueClaim: token() })], [], { create: true, startDate: plans[1].startDate });
    expect(units).toHaveLength(1);
    expect(units[0].currentPlanId).toBe("p2");
  });

  it("date-bounds update claims even when a future source sorts before an eligible preceding plan", async () => {
    await sync("p3", [slot("future")]);
    units[0].createdAt = new Date(0);
    units[0].eligible = true;
    await sync("p1", [slot("preceding")]);
    const preceding = units.find((unit) => unit.placementId === "preceding")!;
    await sync("p2", [slot("destination", { rollingQueueClaim: token() })], [], { startDate: plans[1].startDate });
    expect(units.find((unit) => unit.currentPlanId === "p2")?.id).toBe(preceding.id);
    expect(units.find((unit) => unit.placementId === "future")?.currentPlanId).toBe("p3");
    await expect(sync("p2", [slot("destination"), slot("overclaim", { rollingQueueClaim: token() })], [], { startDate: plans[1].startDate }))
      .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
  });

  it("uses the incoming update start date and does not mark unclaimed preceding units eligible", async () => {
    await sync("p1", [slot("a"), slot("b")]);
    const beforeSourceEnds = plans[0].endDate;
    await expect(sync("p2", [slot("destination", { rollingQueueClaim: token() })], [], { startDate: beforeSourceEnds }))
      .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    await sync("p2", [slot("destination", { rollingQueueClaim: token() })]);
    expect(units.filter((unit) => unit.eligible)).toHaveLength(1);
    expect(units.find((unit) => unit.currentPlanId === "p1")?.eligible).toBe(false);
  });

  it("allows an update claim from its own remainder without requiring a preceding plan", async () => {
    await sync("p2", [slot("a", { batchGroupId: "b" })], [batch(1)]);
    await sync("p2", [slot("a", { batchGroupId: "b" }), slot("from-remainder", { batchGroupId: "b", rollingQueueClaim: token() })], [batch(0)]);
    expect(units).toHaveLength(2);
    expect(units.every((unit) => unit.currentPlanId === "p2" && unit.placementId !== null)).toBe(true);
  });

  it("never satisfies an excess claim with fresh units minted earlier in the same sync", async () => {
    await sync("p1", [slot("a", { used: true })]);
    const claim = token();
    await expect(sync("p2", [slot("fresh")], [batch(2), batch(1, { id: "claimed", rollingQueueClaim: claim })]))
      .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    expect(units).toHaveLength(1);
    expect(mappings).toHaveLength(1);
  });

  it("completes a linked already-cooked unit without backlog release or invented inventory", async () => {
    await sync("p1", [slot("a")]);
    await sync("p2", [slot("b", { rollingQueueClaim: token() })]);
    await sync("p2", [slot("b", { alreadyCooked: true })]);
    const version = groups[0].version;
    await sync("p2", [slot("b", { alreadyCooked: true })]);
    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({ state: "COMPLETED", currentPlanId: "p2", placementId: "b" });
    expect(groups[0]).toMatchObject({ count: 0, version });
    await sync("p3", [slot("new-cooked", { alreadyCooked: true })]);
    expect(units).toHaveLength(1);
    expect(mappings).toHaveLength(2);
  });

  it("aggregates claims once per version and rejects excess demand", async () => {
    await sync("p1", [slot("a"), slot("b"), slot("c")]);
    const claim = token();
    await sync("p2", [slot("d", { rollingQueueClaim: claim })], [batch(2, { rollingQueueClaim: claim })]);
    expect(pending()).toHaveLength(3);
    expect(new Set(units.map((unit) => unit.id)).size).toBe(3);
    expect(units.every((unit) => unit.currentPlanId === "p2")).toBe(true);
    await expect(sync("p3", [slot("x", { rollingQueueClaim: { ...token(), id: "foreign" } })])).rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    await expect(sync("p3", [slot("w", { rollingQueueClaim: token() }), slot("x", { rollingQueueClaim: token() }),
      slot("y", { rollingQueueClaim: token() }), slot("z", { rollingQueueClaim: token() })])).rejects.toThrow("ROLLING_QUEUE_CONFLICT");
  });

  it("releases removal/replacement and protects assigned units from discard", async () => {
    await sync("p1", [slot("a"), slot("b")]);
    await sync("p2", [slot("c", { rollingQueueClaim: token() })], [], { create: true });
    await expect(discardRollingMealQuantity("u", { entryId: token().id, expectedVersion: token().version, quantity: 1 })).resolves.toEqual({ type: "conflict" });
    await sync("p1", []);
    await expect(discardRollingMealQuantity("u", { entryId: token().id, expectedVersion: token().version, quantity: 1 })).resolves.toMatchObject({ type: "success", entry: { count: 1 } });
    expect(units.filter((unit) => unit.state === "DISCARDED")).toHaveLength(1);
    await sync("p2", [slot("c", { recipeId: null, customMeal: { name: "Soup", ingredients: [] } })]);
    expect(pending()).toHaveLength(2);
    expect(units.find((unit) => unit.entryId === groups[0].id && unit.state === "PENDING")?.currentPlanId).toBeNull();
  });

  it("retains zero-count barriers and adds explicit adjustment units", async () => {
    await sync("p1", [slot("a")]);
    await sync("p1", []);
    await expect(discardRollingMealQuantity("u", { entryId: token().id, expectedVersion: token().version, quantity: 1 })).resolves.toEqual({ type: "success", entry: null });
    expect(groups).toHaveLength(1);
    await sync("p1", [slot("a")]);
    expect(pending()).toHaveLength(0);
    await expect(adjustRollingMeal("u", { entryId: token().id, expectedVersion: token().version, count: 2 })).resolves.toMatchObject({ type: "success", entry: { count: 2 } });
    expect(pending()).toHaveLength(2);
    expect(pending().every((unit) => unit.sourcePlanId === null)).toBe(true);
  });

  it("reopens an authoritative completed slot but not historical copies", async () => {
    await sync("p1", [slot("a", { used: true })]);
    await sync("p1", [slot("a")]);
    expect(pending()).toHaveLength(1);
    expect(units).toHaveLength(1);
    await sync("p2", [slot("b", { rollingQueueClaim: token() })]);
    await sync("p1", [slot("a", { used: true })]);
    expect(pending()).toHaveLength(1);
  });

  it("replacing a completed meal clears its pointer without reopening it", async () => {
    await sync("p1", [slot("a", { used: true })]);
    const completedId = units[0].id;
    await sync("p1", [slot("a", { recipeId: null, customMeal: { name: "Soup", ingredients: [] } })]);
    expect(units.find((unit) => unit.id === completedId)).toMatchObject({ state: "COMPLETED", currentPlanId: null, placementId: null });
    expect(pending()).toHaveLength(1);
    expect(pending()[0].placementId).toBe("a");
  });

  it("supersedes only preceding non-overlapping plans", async () => {
    await sync("p1", [slot("a")]);
    await sync("p3", [slot("c")]);
    await sync("p2", [], [], { create: true });
    expect(units.find((unit) => unit.placementId === "a")?.eligible).toBe(true);
    expect(units.find((unit) => unit.placementId === "c")?.eligible).toBe(false);
  });

  it("keeps custom meal content and occasion identities independent", async () => {
    await sync("p1", [
      slot("a", { recipeId: null, customMeal: { name: "Soup", ingredients: [] } }),
      slot("b", { recipeId: null, mealType: "LUNCH", customMeal: { name: "Soup", ingredients: [] } }),
      slot("c", { recipeId: null, customMeal: { name: "Soup", ingredients: [{ ingredientId: "i", unitId: null, amount: 1 }] } }),
    ]);
    expect(groups).toHaveLength(3);
  });

  it("restores a released pending placement without minting another unit", async () => {
    await sync("p1", [slot("a")]);
    const id = units[0].id;
    await sync("p1", []);
    expect(units[0]).toMatchObject({ currentPlanId: null, eligible: true });
    await sync("p1", [slot("a")]);
    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({ id, currentPlanId: "p1", placementId: "a", state: "PENDING" });
    expect(groups[0].count).toBe(1);
    await sync("p1", [slot("a", { used: true })]);
    expect(pending()).toHaveLength(0);
  });

  it("does not restore a released placement after another plan has claimed its unit", async () => {
    await sync("p1", [slot("a")]);
    await sync("p1", []);
    await sync("p2", [slot("b", { rollingQueueClaim: token() })]);
    await sync("p1", [slot("a", { used: true })]);
    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({ currentPlanId: "p2", placementId: "b", state: "PENDING" });
  });

  it("retains custom origin identity through a claimed occasion move and token-free autosaves", async () => {
    const customMeal = { name: "Soup", ingredients: [] };
    await sync("p1", [slot("a", { recipeId: null, customMeal, mealType: "LUNCH" })]);
    const id = units[0].id;
    await sync("p2", [slot("b", { recipeId: null, customMeal, mealType: "DINNER", rollingQueueClaim: { ...token(), mealType: "LUNCH" } })]);
    await sync("p2", [slot("b", { recipeId: null, customMeal, mealType: "BREAKFAST" })]);
    await sync("p1", [slot("a", { recipeId: null, customMeal, mealType: "DINNER", used: true })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].mealType).toBe("LUNCH");
    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({ id, currentPlanId: "p2", state: "PENDING" });
    await sync("p2", [slot("b", { recipeId: null, customMeal, mealType: "BREAKFAST", used: true })]);
    expect(pending()).toHaveLength(0);
  });

  it("rejects spoofed custom claims and terminal custom sources", async () => {
    const customMeal = { name: "Soup", ingredients: [] };
    await sync("p1", [slot("a", { recipeId: null, customMeal, mealType: "LUNCH" })]);
    await expect(sync("p2", [slot("b", { recipeId: null, customMeal, rollingQueueClaim: { ...token(), mealType: "DINNER" } })]))
      .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    await expect(sync("p2", [slot("b", { recipeId: null, customMeal: { name: "Other", ingredients: [] }, rollingQueueClaim: { ...token(), mealType: "LUNCH" } })]))
      .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    await sync("p1", [slot("a", { recipeId: null, customMeal, mealType: "LUNCH", used: true })]);
    await expect(sync("p2", [slot("b", { recipeId: null, customMeal, rollingQueueClaim: { ...token(), mealType: "LUNCH" } })]))
      .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    expect(groups).toHaveLength(1);
    expect(units).toHaveLength(1);
  });

  it("releases only pending authoritative units on plan deletion and preserves terminal lineage", async () => {
    await sync("p1", [slot("moved"), slot("pending"), slot("done", { used: true })], [batch(2)]);
    await sync("p2", [slot("destination", { rollingQueueClaim: token() })]);
    const movedId = units.find((unit) => unit.currentPlanId === "p2")!.id;
    const mappingsBefore = copy(mappings);
    await deleteRollingPlanTx(client, "u", "p1");
    expect(units.find((unit) => unit.id === movedId)?.currentPlanId).toBe("p2");
    expect(units.filter((unit) => unit.state === "PENDING" && unit.currentPlanId === null)).toHaveLength(3);
    expect(units.find((unit) => unit.state === "COMPLETED")).toMatchObject({ currentPlanId: "p1" });
    expect(mappings).toEqual(mappingsBefore);
    expect(groups[0].count).toBe(4);
    const version = groups[0].version;
    await deleteRollingPlanTx(client, "u", "p1");
    expect(groups[0].version).toBe(version);
    await expect(deleteRollingPlanTx(client, "foreign", "p2")).rejects.toThrow("ROLLING_PLAN_NOT_FOUND");
  });
});

describe("batch lineage", () => {
  it.each([0, 1, 2, 4])("converts exactly %i submitted remainders and releases decreases without discarding", async (count) => {
    await sync("p1", [slot("a", { batchGroupId: "b" })], [batch(2)]);
    await sync("p1", [slot("a", { batchGroupId: "b", used: true })], [batch(count)], {
      convertedBatchIds: ["b"], resolvedBatchIds: ["b"],
    });
    expect(units.filter((unit) => unit.state === "CONVERTED")).toHaveLength(count);
    expect(units.filter((unit) => unit.state === "DISCARDED")).toHaveLength(0);
    expect(pending()).toHaveLength(Math.max(2 - count, 0));
    expect(pending().every((unit) => unit.currentPlanId === null && unit.eligible)).toBe(true);
    expect(groups[0].count).toBe(Math.max(2 - count, 0));
    const ids = units.map((unit) => unit.id);
    await sync("p1", [slot("a", { batchGroupId: "b", used: true })], [batch(count)]);
    expect(units.map((unit) => unit.id)).toEqual(ids);
  });

  it("rejects converted claimed excess without capacity instead of minting units", async () => {
    await sync("p1", [slot("a", { batchGroupId: "b" })], [batch(1)]);
    await expect(sync("p1", [slot("a", { batchGroupId: "b", used: true })], [batch(2, { rollingQueueClaim: token() })], { convertedBatchIds: ["b"] }))
      .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    expect(pending()).toHaveLength(2);
    expect(units).toHaveLength(2);
  });

  it("claims real excess capacity before converting the exact expanded remainder", async () => {
    await sync("p1", [slot("a", { batchGroupId: "b" })], [batch(1)]);
    await sync("p2", [slot("donor")]);
    await sync("p2", []);
    await sync("p1", [slot("a", { batchGroupId: "b", used: true })], [batch(2, { rollingQueueClaim: token() })], { convertedBatchIds: ["b"] });
    expect(units).toHaveLength(3);
    expect(units.filter((unit) => unit.state === "CONVERTED")).toHaveLength(2);
    expect(pending()).toHaveLength(0);
  });

  it("requires original remainder rows and completed current scheduled members for conversion", async () => {
    await sync("p1", [slot("a", { batchGroupId: "b" })], [batch(2)]);
    await expect(sync("p1", [slot("a", { batchGroupId: "b", used: true })], [], { convertedBatchIds: ["b"] }))
      .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    await expect(sync("p1", [slot("a", { batchGroupId: "b" })], [batch(2)], { convertedBatchIds: ["b"] }))
      .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    expect(pending()).toHaveLength(3);
  });

  it("keeps remainder identity through audience edits and converts once", async () => {
    await sync("p1", [slot("a", { batchGroupId: "b" })], [batch(2)]);
    const ids = units.map((unit) => unit.id);
    await sync("p1", [slot("a", { batchGroupId: "b" })], [batch(2, { storageRows: [{ count: 1, cookingFamilyMemberIds: [] }, { count: 1, cookingFamilyMemberIds: ["other"] }] })]);
    expect(units.map((unit) => unit.id)).toEqual(ids);
    await sync("p1", [slot("a", { batchGroupId: "b", used: true })], [batch(2)], { convertedBatchIds: ["b"] });
    expect(units.filter((unit) => unit.state === "COMPLETED")).toHaveLength(1);
    expect(units.filter((unit) => unit.state === "CONVERTED")).toHaveLength(2);
    await sync("p1", [slot("a", { batchGroupId: "b", used: true })], [batch(2)]);
    await sync("p1", [slot("a", { batchGroupId: "b", used: false })], [batch(2)]);
    expect(pending()).toHaveLength(0);
    expect(units).toHaveLength(3);
  });

  it("records first-save cooking as terminal remainder evidence", async () => {
    await sync("p1", [slot("a", { batchGroupId: "b", used: true })], [batch(2)], { convertedBatchIds: ["b"] });
    await sync("p1", [slot("a", { batchGroupId: "b" })], [batch(2)]);
    expect(units).toHaveLength(3);
    expect(pending()).toHaveLength(0);
    expect(units.filter((unit) => unit.state === "CONVERTED")).toHaveLength(2);
  });

  it("rejects rebatching a completed converted placement before overwriting its lineage", async () => {
    await sync("p1", [slot("a", { batchGroupId: "b", used: true })], [batch(2)], { convertedBatchIds: ["b"] });
    const before = copy(units);
    await expect(sync("p1", [slot("a", { batchGroupId: "b2" })], [batch(2, { id: "b2" })]))
      .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    expect(units).toEqual(before);
    expect(pending()).toHaveLength(0);
  });

  it("uses persisted conversion resolution as a rebatching barrier even with zero remainder", async () => {
    await sync("p1", [slot("a", { batchGroupId: "b", used: true })], [batch(0)], { convertedBatchIds: ["b"] });
    plans[0].resolvedBatchRemainders = [{ batchId: "b" }];
    await expect(sync("p1", [slot("a", { batchGroupId: "b2" })], [batch(2, { id: "b2" })]))
      .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({ state: "COMPLETED", batchId: "b" });
  });

  it("rejects a scheduled batch move that would strand its unfinished remainder", async () => {
    await sync("p1", [slot("a", { batchGroupId: "b" })], [batch(2)]);
    units.find((unit) => unit.placementId === "a")!.createdAt = new Date(0);
    await expect(sync("p2", [slot("c", { rollingQueueClaim: token() })]))
      .rejects.toThrow("ROLLING_BATCH_REMAINDER_REQUIRED");
    expect(pending()).toHaveLength(3);
    expect(units.every((unit) => unit.currentPlanId === "p1")).toBe(true);
    const claim = token();
    await sync("p2", [slot("c", { rollingQueueClaim: claim, batchGroupId: "next" })], [batch(2, { id: "next", rollingQueueClaim: claim })]);
    await expect(sync("p1", [slot("a", { batchGroupId: "b", used: true })], [batch(2)], { convertedBatchIds: ["b"] }))
      .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
  });

  it("moves remainder into a slot without duplication and blocks stale remainder recapture", async () => {
    await sync("p1", [], [batch(2)]);
    const ids = units.map((unit) => unit.id);
    await sync("p1", [slot("a", { batchGroupId: "b" })], [batch(1)]);
    expect(units.map((unit) => unit.id)).toEqual(ids);
    const claim = token();
    await sync("p2", [slot("c", { rollingQueueClaim: claim })], [batch(1, { id: "next", rollingQueueClaim: claim })]);
    await sync("p1", [slot("a", { batchGroupId: "b", used: true })], [batch(2)]);
    expect(pending()).toHaveLength(2);
    expect(units).toHaveLength(2);
    expect(units.every((unit) => unit.currentPlanId === "p2")).toBe(true);
  });

  it("allows an independent remainder move and cooking the remaining authoritative source", async () => {
    await sync("p1", [slot("a", { batchGroupId: "b" })], [batch(2)]);
    units.filter((unit) => unit.placementId === null).forEach((unit) => { unit.createdAt = new Date(0); });
    await sync("p2", [slot("moved-remainder", { rollingQueueClaim: token() })]);
    await expect(verifyRollingBatchAssignmentsTx(client, "u", "p1", ["b"])).resolves.toBeUndefined();
    await sync("p1", [slot("a", { batchGroupId: "b", used: true })], [batch(1)], { convertedBatchIds: ["b"] });
    expect(units.filter((unit) => unit.state === "CONVERTED")).toHaveLength(1);
    expect(pending()).toHaveLength(1);
    expect(pending()[0]).toMatchObject({ currentPlanId: "p2", placementId: "moved-remainder" });
  });

  it("allows a partial scheduled split while another scheduled source member owns the remainder", async () => {
    await sync("p1", [slot("a", { batchGroupId: "b" }), slot("stay", { batchGroupId: "b" })], [batch(2)]);
    units.find((unit) => unit.placementId === "a")!.createdAt = new Date(0);
    await sync("p2", [slot("moved", { rollingQueueClaim: token() })]);
    await expect(verifyRollingBatchAssignmentsTx(client, "u", "p1", ["b"])).resolves.toBeUndefined();
    await sync("p1", [slot("a", { batchGroupId: "b", used: true }), slot("stay", { batchGroupId: "b", used: true })], [batch(2)], { convertedBatchIds: ["b"] });
    expect(units.filter((unit) => unit.state === "CONVERTED")).toHaveLength(2);
    expect(pending()).toHaveLength(1);
    expect(pending()[0].currentPlanId).toBe("p2");
  });

  it("allocates collision-free remainder history keys even with sparse preexisting mappings", async () => {
    await sync("p1", [], [batch(2)]);
    const oldMapping = mappings[0];
    mappings[0] = { ...oldMapping, placementId: "rolling-remainder:b:2" };
    mappings.splice(1, 1);
    await sync("p1", [], [batch(3)]);
    expect(mappings).toHaveLength(3);
    expect(new Set(mappings.map((mapping) => mapping.placementId)).size).toBe(3);
    expect(new Set(mappings.map((mapping) => mapping.unitId)).size).toBe(3);
    const keys = mappings.map((mapping) => mapping.placementId);
    await sync("p1", [], [batch(3)]);
    expect(mappings.map((mapping) => mapping.placementId)).toEqual(keys);
  });

  it("does not overwrite an occupied unit-based remainder key", async () => {
    await sync("p1", [], [batch(2)]);
    const occupied = `rolling-remainder:b:${units[1].id}`;
    mappings = [{ ...mappings[0], placementId: occupied }];
    await sync("p1", [], [batch(2)]);
    expect(mappings.find((mapping) => mapping.placementId === occupied)?.unitId).toBe(units[0].id);
    expect(mappings.find((mapping) => mapping.unitId === units[1].id)?.placementId).toBe(`${occupied}:1`);
    const before = copy(mappings);
    await sync("p1", [], [batch(2)]);
    expect(mappings).toEqual(before);
  });

  it("rejects moving a member out of a batch during the same save that cooks it", async () => {
    await sync("p1", [slot("a", { batchGroupId: "b" })], [batch(2)]);
    await expect(sync("p1", [slot("a", { batchGroupId: "other", used: true })], [batch(2)], { convertedBatchIds: ["b"] }))
      .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    expect(pending()).toHaveLength(3);
  });

  it("verifies batch lineage before cooking and rejects moved scheduled or remainder members", async () => {
    await sync("p1", [slot("a", { batchGroupId: "b" })], [batch(2)]);
    await expect(verifyRollingBatchAssignmentsTx(client, "u", "p1", ["b"])).resolves.toBeUndefined();
    await sync("p1", [slot("a", { batchGroupId: "b" }), slot("from-remainder", { batchGroupId: "b" })], [batch(1)]);
    await expect(verifyRollingBatchAssignmentsTx(client, "u", "p1", ["b"])).resolves.toBeUndefined();
    const claim = token();
    await sync("p2", [], [batch(3, { id: "next", rollingQueueClaim: claim })]);
    await expect(verifyRollingBatchAssignmentsTx(client, "u", "p1", ["b"])).rejects.toThrow("ROLLING_QUEUE_CONFLICT");
    await expect(verifyRollingBatchAssignmentsTx(client, "u", "p1", ["unrelated"])).resolves.toBeUndefined();
    await expect(verifyRollingBatchAssignmentsTx(client, "foreign", "p1", ["b"])).rejects.toThrow("ROLLING_PLAN_NOT_FOUND");
    await expect(verifyRollingBatchAssignmentsTx(client, "u", "p2", ["next"])).rejects.toThrow("ROLLING_QUEUE_CONFLICT");
  });
});

describe("batch remainder snapshot normalization", () => {
  const normalize = (incoming: RollingPlanBatch[], existing: RollingPlanBatch[]) =>
    reconcileRollingBatchRemaindersTx(client, "u", "p1", incoming, existing);
  async function movedRemainder(existing = batch(2)) {
    await sync("p1", [slot("a", { batchGroupId: "b" })], [existing]);
    units.filter((unit) => unit.placementId === null).forEach((unit) => { unit.createdAt = new Date(0); });
    await sync("p2", [slot("moved", { rollingQueueClaim: token() })]);
  }

  it("normalizes unchanged stale source rows before save and completion without duplicating moved units", async () => {
    const persisted = [batch(2)];
    await movedRemainder();
    const ids = units.map((unit) => unit.id);
    vi.clearAllMocks();
    const normalized = await normalize(persisted, persisted);
    expect(normalized).toEqual([batch(1)]);
    await expect(normalize(persisted, persisted)).resolves.toEqual(normalized);
    expect(tx.rollingMealUnit.update).not.toHaveBeenCalled();
    expect(tx.rollingMealEntry.update).not.toHaveBeenCalled();
    await sync("p1", [slot("a", { batchGroupId: "b" })], normalized);
    const saved = copy(normalized);
    const repeated = await normalize(saved, saved);
    expect(repeated).toEqual(saved);
    await sync("p1", [slot("a", { batchGroupId: "b" })], repeated);
    expect(units.map((unit) => unit.id)).toEqual(ids);
    const forCompletion = await normalize(saved, saved);
    const lotQuantity = forCompletion.flatMap((batch) => batch.storageRows).reduce((sum, row) => sum + row.count, 0);
    await sync("p1", [slot("a", { batchGroupId: "b", used: true })], forCompletion, { convertedBatchIds: ["b"] });
    expect(lotQuantity).toBe(1);
    expect(units.filter((unit) => unit.state === "CONVERTED")).toHaveLength(1);
    expect(pending()).toHaveLength(1);
    expect(pending()[0]).toMatchObject({ currentPlanId: "p2", placementId: "moved" });
    expect(units).toHaveLength(3);
  });

  it("applies only explicit increases relative to the old snapshot and preserves batch metadata", async () => {
    await movedRemainder();
    const incoming = { ...batch(3), rollingQueueClaim: null, extraMetadata: "preserved" };
    const result = await reconcileRollingBatchRemaindersTx(client, "u", "p1", [incoming], [batch(2)]);
    expect(result).toEqual([{ ...incoming, storageRows: batch(2).storageRows }]);
    await sync("p1", [slot("a", { batchGroupId: "b" })], result);
    expect(units).toHaveLength(4);
    await expect(normalize(result, result)).resolves.toEqual(result);
  });

  it.each([0, 1])("releases only the live source remainder after an explicit decrease to %i", async (submitted) => {
    await movedRemainder();
    const result = await normalize([batch(submitted)], [batch(2)]);
    expect(result[0].storageRows.reduce((sum, row) => sum + row.count, 0)).toBe(0);
    await sync("p1", [slot("a", { batchGroupId: "b" })], result);
    expect(units).toHaveLength(3);
    expect(units.filter((unit) => unit.currentPlanId === null && unit.eligible && unit.state === "PENDING")).toHaveLength(1);
    expect(units.filter((unit) => unit.state === "DISCARDED")).toHaveLength(0);
  });

  it("retains submitted audience order deterministically and does not mutate either snapshot", async () => {
    const existing = batch(2, { storageRows: [
      { count: 1, cookingFamilyMemberIds: ["first"] }, { count: 1, cookingFamilyMemberIds: ["second"] },
    ] });
    await movedRemainder(existing);
    const before = copy(existing);
    await expect(normalize([existing], [existing])).resolves.toEqual([{
      ...existing, storageRows: [{ count: 1, cookingFamilyMemberIds: ["first"] }],
    }]);
    expect(existing).toEqual(before);
  });

  it("does not revive source remainder snapshots when all authoritative members have moved", async () => {
    await sync("p1", [slot("a", { batchGroupId: "b" })], [batch(2)]);
    const claim = token();
    await sync("p2", [slot("destination", { batchGroupId: "next", rollingQueueClaim: claim })], [batch(2, { id: "next", rollingQueueClaim: claim })]);
    const normalized = await normalize([batch(2)], [batch(2)]);
    expect(normalized[0].storageRows).toEqual([]);
    await sync("p1", [slot("a", { batchGroupId: "b" })], normalized);
    expect(units).toHaveLength(3);
    expect(units.every((unit) => unit.currentPlanId === "p2")).toBe(true);
  });

  it("leaves new or untracked batches unchanged and rejects invalid quantities and foreign ownership", async () => {
    await expect(normalize([batch(2)], [])).resolves.toEqual([batch(2)]);
    await expect(normalize([batch(2)], [batch(2)])).resolves.toEqual([batch(2)]);
    await expect(normalize([batch(-1)], [batch(2)])).rejects.toThrow("ROLLING_INVALID_QUANTITY");
    await expect(normalize([batch(1), batch(1)], [])).rejects.toThrow("ROLLING_INVALID_PLACEMENT");
    await expect(reconcileRollingBatchRemaindersTx(client, "foreign", "p1", [batch(2)], [batch(2)]))
      .rejects.toThrow("ROLLING_PLAN_NOT_FOUND");
  });
});
