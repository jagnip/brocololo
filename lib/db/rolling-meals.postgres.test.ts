import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import type { Prisma } from "@/src/generated/client";
import { prisma } from "./index";
import {
  deleteRollingPlanTx, ensureRollingLifecycleTx, syncRollingPlanTx, verifyRollingBatchAssignmentsTx,
  type RollingPlanSlot,
} from "./rolling-meals";

// Both flags require the operator to explicitly acknowledge a disposable DB.
const enabled = process.env.RUN_POSTGRES_INTEGRATION === "1" && process.env.POSTGRES_INTEGRATION_DISPOSABLE === "1";
const meal = { name: "Integration pancake", ingredients: [] };
const slot = (placementId: string, used = false): RollingPlanSlot => ({
  placementId, recipeId: null, customMeal: meal, mealType: "DINNER", used,
});

afterAll(async () => {
  if (enabled) await prisma.$disconnect();
});

async function fixture(operation: (tx: Prisma.TransactionClient, userId: string) => Promise<void>) {
  if (!process.env.DATABASE_URL) throw new Error("Disposable DATABASE_URL is required");
  const userId = `rolling-integration-${randomUUID()}`;
  const rollback = new Error("intentional fixture rollback");
  await expect(prisma.$transaction(async (tx) => {
    await tx.user.create({ data: { id: userId, clerkId: userId } });
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    await ensureRollingLifecycleTx(tx, userId);
    await operation(tx, userId);
    throw rollback;
  })).rejects.toBe(rollback);
  expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull();
}

describe.skipIf(!enabled)("rolling lifecycle PostgreSQL integration (disposable database only)", () => {
  it("conserves one unit across three plans and retains historical completion barriers", async () => {
    await fixture(async (tx, userId) => {
      const plans = [];
      for (let week = 1; week <= 3; week++) {
        plans.push(await tx.plan.create({ data: { userId, startDate: new Date(2026, 0, week * 7), endDate: new Date(2026, 0, week * 7 + 6) } }));
      }
      await syncRollingPlanTx(tx, userId, plans[0].id, [slot("a")], []);
      const initial = await tx.rollingMealUnit.findFirstOrThrow({ where: { entry: { userId } } });
      for (let index = 1; index < 3; index++) {
        const entry = await tx.rollingMealEntry.findFirstOrThrow({ where: { userId } });
        await syncRollingPlanTx(tx, userId, plans[index].id, [{ ...slot(index === 1 ? "b" : "c"), rollingQueueClaim: { id: entry.id, version: entry.version } }], [], { create: true });
      }
      await syncRollingPlanTx(tx, userId, plans[0].id, [slot("a", true)], []);
      expect(await tx.rollingMealUnit.count({ where: { entry: { userId }, state: "PENDING" } })).toBe(1);
      await syncRollingPlanTx(tx, userId, plans[2].id, [slot("c", true)], []);
      await syncRollingPlanTx(tx, userId, plans[2].id, [slot("c", true)], []);
      await syncRollingPlanTx(tx, userId, plans[0].id, [slot("a")], []);
      expect(await tx.rollingMealUnit.findUniqueOrThrow({ where: { id: initial.id } })).toMatchObject({ state: "COMPLETED", currentPlanId: plans[2].id });
      expect(await tx.rollingMealUnit.count({ where: { entry: { userId } } })).toBe(1);
      expect(await tx.rollingMealPlacement.count({ where: { unitId: initial.id } })).toBe(3);
      expect(await tx.rollingMealEntry.findFirstOrThrow({ where: { userId } })).toMatchObject({ count: 0 });
      await tx.plan.delete({ where: { id: plans[0].id } });
      expect(await tx.rollingMealPlacement.count({ where: { unitId: initial.id } })).toBe(3);
    });
  });

  it("rolls back all assignment changes on an over-claim", async () => {
    await fixture(async (tx, userId) => {
      const source = await tx.plan.create({ data: { userId, startDate: new Date(), endDate: new Date() } });
      const destination = await tx.plan.create({ data: { userId, startDate: new Date(), endDate: new Date() } });
      await syncRollingPlanTx(tx, userId, source.id, [slot("a")], []);
      const entry = await tx.rollingMealEntry.findFirstOrThrow({ where: { userId } });
      const claim = { id: entry.id, version: entry.version };
      await expect(syncRollingPlanTx(tx, userId, destination.id, [
        { ...slot("b"), rollingQueueClaim: claim }, { ...slot("c"), rollingQueueClaim: claim },
      ], [])).rejects.toThrow("ROLLING_QUEUE_CONFLICT");
      expect(await tx.rollingMealUnit.findFirstOrThrow({ where: { entryId: entry.id } })).toMatchObject({ currentPlanId: source.id, placementId: "a" });
      expect(await tx.rollingMealPlacement.count({ where: { planId: destination.id } })).toBe(0);
    });
  });

  it("enforces unique authoritative destinations and rolls back fixtures on constraint failure", async () => {
    const userId = `rolling-integration-${randomUUID()}`;
    await expect(prisma.$transaction(async (tx) => {
      await tx.user.create({ data: { id: userId, clerkId: userId } });
      const entry = await tx.rollingMealEntry.create({ data: { userId, identity: "custom:test", mealType: "DINNER", customMeal: meal, count: 0 } });
      await tx.rollingMealUnit.create({ data: { entryId: entry.id, currentPlanId: "snapshot", placementId: "a" } });
      await tx.rollingMealUnit.create({ data: { entryId: entry.id, currentPlanId: "snapshot", placementId: "a" } });
    })).rejects.toMatchObject({ code: "P2002" });
    expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull();
  });

  it("enforces create-plan source dates and rejects changed historical custom identity", async () => {
    await fixture(async (tx, userId) => {
      const startDate = new Date("2026-02-08T00:00:00Z");
      const source = await tx.plan.create({ data: { userId, startDate, endDate: startDate } });
      const destination = await tx.plan.create({ data: { userId, startDate, endDate: new Date("2026-02-14T00:00:00Z") } });
      await syncRollingPlanTx(tx, userId, source.id, [slot("a")], []);
      const entry = await tx.rollingMealEntry.findFirstOrThrow({ where: { userId } });
      const moved = { ...slot("b"), rollingQueueClaim: { id: entry.id, version: entry.version } };
      await expect(syncRollingPlanTx(tx, userId, destination.id, [moved], [], { create: true, startDate }))
        .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
      await tx.plan.update({ where: { id: source.id }, data: { endDate: new Date("2026-02-07T00:00:00Z") } });
      await syncRollingPlanTx(tx, userId, destination.id, [moved], [], { create: true, startDate });
      await expect(syncRollingPlanTx(tx, userId, source.id, [{ ...slot("a"), customMeal: { name: "Changed identity", ingredients: [] } }], []))
        .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
      expect(await tx.rollingMealEntry.count({ where: { userId } })).toBe(1);
      expect(await tx.rollingMealUnit.findFirstOrThrow({ where: { entryId: entry.id } })).toMatchObject({ currentPlanId: destination.id });
    });
  });

  it("completes linked already-cooked units and releases only pending units before plan deletion", async () => {
    await fixture(async (tx, userId) => {
      const plan = await tx.plan.create({ data: { userId, startDate: new Date(), endDate: new Date() } });
      await syncRollingPlanTx(tx, userId, plan.id, [slot("pending"), slot("cooked")], []);
      await syncRollingPlanTx(tx, userId, plan.id, [slot("pending"), { ...slot("cooked"), alreadyCooked: true }], []);
      await deleteRollingPlanTx(tx, userId, plan.id);
      await tx.plan.delete({ where: { id: plan.id } });
      expect(await tx.rollingMealUnit.count({ where: { entry: { userId }, state: "PENDING", currentPlanId: null, eligible: true } })).toBe(1);
      expect(await tx.rollingMealUnit.count({ where: { entry: { userId }, state: "COMPLETED", currentPlanId: plan.id } })).toBe(1);
      expect(await tx.rollingMealPlacement.count({ where: { planId: plan.id } })).toBe(2);
      expect(await tx.rollingMealEntry.findFirstOrThrow({ where: { userId } })).toMatchObject({ count: 1 });
      expect(await tx.storedMealLot.count({ where: { userId } })).toBe(0);
    });
  });

  it("rejects stale batch cooking before inventory creation and preserves remainder lineage", async () => {
    await fixture(async (tx, userId) => {
      const recipe = await tx.recipe.create({ data: { userId, name: "Integration batch", slug: "integration-batch", handsOnTime: 1, totalTime: 1, servings: 1, notes: [] } });
      const source = await tx.plan.create({ data: { userId, startDate: new Date(), endDate: new Date() } });
      const destination = await tx.plan.create({ data: { userId, startDate: new Date(), endDate: new Date() } });
      const sourceSlot = { ...slot("a"), recipeId: recipe.id, customMeal: null, batchGroupId: "source-batch" };
      const sourceBatch = { id: "source-batch", recipeId: recipe.id, storageRows: [{ count: 2, cookingFamilyMemberIds: [] }] };
      await syncRollingPlanTx(tx, userId, source.id, [sourceSlot], [sourceBatch]);
      await verifyRollingBatchAssignmentsTx(tx, userId, source.id, [sourceBatch.id]);
      const entry = await tx.rollingMealEntry.findFirstOrThrow({ where: { userId } });
      const claim = { id: entry.id, version: entry.version };
      await syncRollingPlanTx(tx, userId, destination.id,
        [{ ...sourceSlot, placementId: "b", batchGroupId: "destination-batch", rollingQueueClaim: claim }],
        [{ ...sourceBatch, id: "destination-batch", rollingQueueClaim: claim }]);
      await expect(verifyRollingBatchAssignmentsTx(tx, userId, source.id, [sourceBatch.id])).rejects.toThrow("ROLLING_QUEUE_CONFLICT");
      await expect(syncRollingPlanTx(tx, userId, source.id, [{ ...sourceSlot, used: true }], [sourceBatch], { convertedBatchIds: [sourceBatch.id] }))
        .rejects.toThrow("ROLLING_QUEUE_CONFLICT");
      expect(await tx.rollingMealUnit.count({ where: { entryId: entry.id, state: "PENDING", currentPlanId: destination.id } })).toBe(3);
      expect(await tx.storedMealLot.count({ where: { userId } })).toBe(0);
    });
  });

  it("serializes concurrent claims so only one destination commits", async () => {
    const userId = `rolling-integration-${randomUUID()}`;
    try {
      const { destinations, claim } = await prisma.$transaction(async (tx) => {
        await tx.user.create({ data: { id: userId, clerkId: userId } });
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
        await ensureRollingLifecycleTx(tx, userId);
        const plans = [];
        for (let index = 0; index < 3; index++) {
          plans.push(await tx.plan.create({ data: { userId, startDate: new Date(), endDate: new Date() } }));
        }
        await syncRollingPlanTx(tx, userId, plans[0].id, [slot("a")], []);
        const entry = await tx.rollingMealEntry.findFirstOrThrow({ where: { userId } });
        return { destinations: plans.slice(1), claim: { id: entry.id, version: entry.version } };
      });
      const results = await Promise.allSettled(destinations.map((plan) => prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
        await syncRollingPlanTx(tx, userId, plan.id, [{ ...slot("destination"), rollingQueueClaim: claim }], []);
      })));
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      const rejected = results.find((result) => result.status === "rejected");
      expect(rejected?.status === "rejected" ? rejected.reason.message : null).toBe("ROLLING_QUEUE_CONFLICT");
      expect(await prisma.rollingMealUnit.count({ where: { entry: { userId }, state: "PENDING" } })).toBe(1);
      expect(await prisma.rollingMealPlacement.count({ where: { planId: { in: destinations.map((plan) => plan.id) } } })).toBe(1);
    } finally {
      await prisma.$transaction(async (tx) => {
        await tx.rollingMealPlacement.deleteMany({ where: { unit: { entry: { userId } } } });
        await tx.rollingMealUnit.deleteMany({ where: { entry: { userId } } });
        await tx.user.deleteMany({ where: { id: userId } });
      });
    }
  });
});
