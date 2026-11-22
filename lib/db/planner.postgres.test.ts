import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { afterAll, describe, expect, it, vi } from "vitest";
import { PlannerMealType, PrismaClient, type Prisma } from "@/src/generated/client";
import type { SlotInputType } from "@/types/planner";

const context = vi.hoisted(() => ({ tx: undefined as import("@/src/generated/client").Prisma.TransactionClient | undefined }));

vi.mock("./index", () => ({
  prisma: {
    $transaction: (callback: (tx: Prisma.TransactionClient) => unknown) => {
      if (!context.tx) throw new Error("Integration transaction not active");
      return callback(context.tx);
    },
    recipe: {
      updateMany: (...args: Parameters<Prisma.TransactionClient["recipe"]["updateMany"]>) => {
        if (!context.tx) throw new Error("Integration transaction not active");
        return context.tx.recipe.updateMany(...args);
      },
    },
  },
}));

import { createPlan, updatePlan } from "./planner";
import { listRollingMealQueue } from "./rolling-meals";

const enabled = process.env.RUN_POSTGRES_INTEGRATION === "1" && process.env.POSTGRES_INTEGRATION_DISPOSABLE === "1";
const pool = enabled ? new Pool({ connectionString: process.env.DATABASE_URL }) : undefined;
const client = pool ? new PrismaClient({ adapter: new PrismaPg(pool) }) : undefined;

afterAll(async () => {
  await client?.$disconnect();
  await pool?.end();
});

describe.skipIf(!enabled)("planner PostgreSQL integration", () => {
  it.each([1, 3])("conserves %i meals through W1 -> W2 -> W3 and completes only the third placement", async (quantity) => {
    if (!process.env.DATABASE_URL || !client) throw new Error("DATABASE_URL is required");
    const rollback = new Error("intentional fixture rollback");
    const userId = `integration-${randomUUID()}`;
    try {
      await client.$transaction(async (tx) => {
        context.tx = tx;
        await tx.user.create({ data: { id: userId, clerkId: userId } });
        const date = new Date("2040-02-01T00:00:00.000Z");
        const secondDate = new Date("2040-02-08T00:00:00.000Z");
        const thirdDate = new Date("2040-02-15T00:00:00.000Z");
        const slot: SlotInputType = {
          date, mealType: PlannerMealType.DINNER, recipe: null,
          customMeal: { name: "Soup", ingredients: [] }, alternatives: [], used: false,
        };
        const firstSlots = Array.from({ length: quantity }, (_, index) => ({
          ...slot, placementId: `source-${index}`, date: new Date(date.getTime() + index * 86400000),
        }));
        const first = await createPlan(userId, date, firstSlots.at(-1)!.date, firstSlots);
        if (first.type !== "success") throw new Error("First plan creation failed");
        expect(await listRollingMealQueue(userId)).toEqual([]);
        expect(await tx.rollingMealUnit.count({ where: { entry: { userId } } })).toBe(quantity);
        const initialEntry = await tx.rollingMealEntry.findFirstOrThrow({ where: { userId } });
        const firstSnapshot = await tx.planSlot.findMany({ where: { planId: first.plan.id }, orderBy: { placementId: "asc" } });

        const second = await createPlan(userId, secondDate, secondDate, [{
          ...slot, date: secondDate, placementId: "second", isRolledOver: true,
          rollingQueueClaim: { id: initialEntry.id, version: initialEntry.version, mealType: slot.mealType },
        }]);
        if (second.type !== "success") throw new Error("Second plan creation failed");
        const entry = await tx.rollingMealEntry.findFirstOrThrow({ where: { userId } });
        expect(entry.count).toBe(quantity);
        expect(await listRollingMealQueue(userId)).toEqual([expect.objectContaining({ id: entry.id, count: quantity })]);
        const secondSnapshot = await tx.planSlot.findMany({ where: { planId: second.plan.id } });

        const third = await createPlan(userId, thirdDate, thirdDate, [{
          ...slot, date: thirdDate, placementId: "third", isRolledOver: true,
          rollingQueueClaim: { id: entry.id, version: entry.version, mealType: slot.mealType },
        }]);
        if (third.type !== "success") throw new Error("Third plan creation failed");
        expect(await tx.rollingMealUnit.count({ where: { entry: { userId } } })).toBe(quantity);
        expect(await listRollingMealQueue(userId)).toEqual([expect.objectContaining({ count: quantity })]);
        const mappings = await tx.rollingMealPlacement.findMany({ where: {
          planId: { in: [second.plan.id, third.plan.id] },
        } });
        expect(mappings).toHaveLength(2);
        expect(new Set(mappings.map(({ unitId }) => unitId)).size).toBe(1);
        const completed = [{
          date: thirdDate, mealType: slot.mealType, placementId: "third", recipeId: null,
          customMeal: slot.customMeal, alternativeRecipeIds: [], cookingFamilyMemberIds: [],
          used: true, isRolledOver: true,
        }];
        expect(await updatePlan(userId, third.plan.id, completed, { expectedVersion: 0 })).toEqual({ type: "success", version: 1 });
        expect(await updatePlan(userId, third.plan.id, completed, { expectedVersion: 1 })).toEqual({ type: "success", version: 2 });
        expect(await listRollingMealQueue(userId)).toEqual(quantity === 1 ? [] : [expect.objectContaining({ count: 2 })]);
        expect(await tx.rollingMealUnit.count({ where: { entry: { userId }, state: "COMPLETED" } })).toBe(1);
        expect(await tx.rollingMealUnit.count({ where: { entry: { userId }, state: "PENDING" } })).toBe(quantity - 1);
        expect(await tx.planSlot.findMany({ where: { planId: first.plan.id }, orderBy: { placementId: "asc" } })).toEqual(firstSnapshot);
        expect(await tx.planSlot.findMany({ where: { planId: second.plan.id } })).toEqual(secondSnapshot);
        throw rollback;
      }, { timeout: 30000 });
      throw new Error("Fixture transaction unexpectedly committed");
    } catch (error) {
      if (error !== rollback) throw error;
    } finally {
      context.tx = undefined;
      expect(await client.user.findUnique({ where: { id: userId } })).toBeNull();
    }
  }, 40000);

  it.each([
    { firstSaveCompleted: true, remainder: 2 },
    { firstSaveCompleted: true, remainder: 0 },
    { firstSaveCompleted: false, remainder: 2 },
    { firstSaveCompleted: false, remainder: 3 },
    { firstSaveCompleted: false, remainder: 1 },
    { firstSaveCompleted: false, remainder: 0 },
  ])("conserves batch conversion exactly once with $firstSaveCompleted first-save completion and $remainder remainder", async ({ firstSaveCompleted, remainder }) => {
    if (!process.env.DATABASE_URL || !client) throw new Error("DATABASE_URL is required");
    const rollback = new Error("intentional fixture rollback");
    const userId = `integration-${randomUUID()}`;
    try {
      await client.$transaction(async (tx) => {
        context.tx = tx;
        await tx.user.create({ data: { id: userId, clerkId: userId } });
        const recipe = await tx.recipe.create({ data: {
          userId, name: "Batch conversion fixture", slug: userId,
          handsOnTime: 1, totalTime: 1, notes: [], servings: 1, isBatchRecipe: true,
        } });
        const date = new Date("2040-03-01T00:00:00.000Z");
        const initialRemainder = firstSaveCompleted ? remainder : 2;
        const batch = {
          id: randomUUID(), recipeId: recipe.id,
          storageRows: initialRemainder ? [{ count: initialRemainder, cookingFamilyMemberIds: [] }] : [],
        };
        const slot: SlotInputType = {
          date, mealType: PlannerMealType.DINNER, recipe: { id: recipe.id } as SlotInputType["recipe"],
          customMeal: null, alternatives: [], used: firstSaveCompleted, placementId: "scheduled", batchGroupId: batch.id,
        };
        const created = await createPlan(userId, date, date, [slot], [batch]);
        if (created.type !== "success") throw new Error("Plan creation failed");
        const planId = created.plan.id;
        if (!firstSaveCompleted) {
          expect(await tx.rollingMealUnit.count({ where: { entry: { userId }, state: "PENDING" } })).toBe(3);
        }
        const completed = [{
          date, mealType: slot.mealType, recipeId: recipe.id, customMeal: null, alternativeRecipeIds: [],
          cookingFamilyMemberIds: [], used: true, placementId: "scheduled", batchGroupId: batch.id,
        }];
        const editedBatch = { ...batch, storageRows: remainder ? [{ count: remainder, cookingFamilyMemberIds: [] }] : [] };
        if (!firstSaveCompleted) {
          expect(await updatePlan(userId, planId, completed, { expectedVersion: 0 }, [editedBatch])).toEqual({ type: "success", version: 1 });
        }
        const lots = await tx.storedMealLot.findMany({ where: { userId } });
        expect(lots).toEqual(remainder ? [expect.objectContaining({ count: remainder, sourcePlanId: planId, sourcePlanBatchId: batch.id })] : []);
        expect(await tx.rollingMealUnit.count({ where: { entry: { userId }, state: "CONVERTED" } })).toBe(remainder);
        expect(await tx.rollingMealUnit.count({ where: { entry: { userId }, state: "COMPLETED" } })).toBe(1);
        const released = Math.max(0, initialRemainder - remainder);
        expect(await tx.rollingMealUnit.count({ where: { entry: { userId }, state: "PENDING", currentPlanId: null, eligible: true } })).toBe(released);
        expect(await tx.planBatchRemainderResolution.count({ where: { planId, batchId: batch.id } })).toBe(1);
        const expectedVersion = firstSaveCompleted ? 0 : 1;
        expect(await updatePlan(userId, planId, completed, { expectedVersion }, [batch])).toEqual({ type: "success", version: expectedVersion + 1 });
        expect(await tx.storedMealLot.findMany({ where: { userId } })).toEqual(lots);
        expect(await tx.storedMealEvent.findMany({ where: { userId } })).toEqual(remainder ? [
          expect.objectContaining({ type: "CREATED", quantity: remainder, nextCount: remainder }),
        ] : []);
        expect(await tx.rollingMealUnit.count({ where: { entry: { userId } } })).toBe(1 + remainder + released);
        expect(await listRollingMealQueue(userId, { includeCurrent: true })).toEqual(released ? [expect.objectContaining({ count: released })] : []);
        expect(await tx.planBatchStorageRow.findMany({ where: { planBatchId: batch.id } })).toEqual([]);
        throw rollback;
      }, { timeout: 30000 });
      throw new Error("Fixture transaction unexpectedly committed");
    } catch (error) {
      if (error !== rollback) throw error;
    } finally {
      context.tx = undefined;
      expect(await client.user.findUnique({ where: { id: userId } })).toBeNull();
    }
  }, 40000);

  it.each([
    { split: "scheduled", intermediateSave: false, delta: 0 },
    { split: "remainder", intermediateSave: false, delta: 0 },
    { split: "remainder", intermediateSave: true, delta: 0 },
    { split: "remainder", intermediateSave: false, delta: 1 },
    { split: "remainder", intermediateSave: false, delta: -1 },
    { split: "remainder", intermediateSave: true, delta: 1 },
    { split: "remainder", intermediateSave: true, delta: -1 },
  ])("conserves a $split split with intermediate save $intermediateSave and completion delta $delta", async ({ split, intermediateSave, delta }) => {
    if (!process.env.DATABASE_URL || !client) throw new Error("DATABASE_URL is required");
    const rollback = new Error("intentional fixture rollback");
    const userId = `integration-${randomUUID()}`;
    try {
      await client.$transaction(async (tx) => {
        context.tx = tx;
        await tx.user.create({ data: { id: userId, clerkId: userId } });
        const recipe = await tx.recipe.create({ data: {
          userId, name: "Split batch fixture", slug: userId,
          handsOnTime: 1, totalTime: 1, notes: [], servings: 1, isBatchRecipe: true,
        } });
        const date = new Date("2040-04-01T00:00:00.000Z");
        const destinationDate = new Date("2040-04-08T00:00:00.000Z");
        const batch = { id: randomUUID(), recipeId: recipe.id, storageRows: [{ count: 2, cookingFamilyMemberIds: [] }] };
        const slot: SlotInputType = {
          date, mealType: PlannerMealType.DINNER, recipe: { id: recipe.id } as SlotInputType["recipe"],
          customMeal: null, alternatives: [], used: false, placementId: "source", batchGroupId: batch.id,
        };
        const slots = split === "scheduled" ? [slot, { ...slot, placementId: "stay", mealType: PlannerMealType.LUNCH }] : [slot];
        const source = await createPlan(userId, date, date, slots, [batch]);
        if (source.type !== "success") throw new Error("Source creation failed");
        const entry = await tx.rollingMealEntry.findFirstOrThrow({ where: { userId } });
        const moved = await tx.rollingMealUnit.findFirstOrThrow({ where: {
          entryId: entry.id, placementId: split === "scheduled" ? "source" : null,
        } });
        // Force claim selection to exercise each lineage branch deterministically.
        await tx.rollingMealUnit.update({ where: { id: moved.id }, data: { createdAt: new Date(0) } });
        const destination = await createPlan(userId, destinationDate, destinationDate, [{
          ...slot, date: destinationDate, placementId: "destination", batchGroupId: null,
          isRolledOver: true, rollingQueueClaim: { id: entry.id, version: entry.version },
        }]);
        if (destination.type !== "success") throw new Error("Destination creation failed");
        const destinationSnapshot = await tx.planSlot.findMany({ where: { planId: destination.plan.id } });
        const liveRemainder = split === "scheduled" ? 2 : 1;
        const remainder = liveRemainder + delta;
        const released = Math.max(0, -delta);
        const completedSource = slots.map((input) => ({
          date, mealType: input.mealType, recipeId: recipe.id, placementId: input.placementId,
          batchGroupId: batch.id, customMeal: null, alternativeRecipeIds: [], cookingFamilyMemberIds: [], used: true,
        }));
        let version = 0;
        if (intermediateSave) {
          expect(await updatePlan(userId, source.plan.id, completedSource.map((input) => ({ ...input, used: false })), { expectedVersion: version }, [batch])).toEqual({ type: "success", version: version + 1 });
          version += 1;
          expect(await tx.planBatchStorageRow.findMany({ where: { planBatchId: batch.id } })).toEqual([
            expect.objectContaining({ count: liveRemainder }),
          ]);
          expect(await tx.rollingMealUnit.count({ where: { entryId: entry.id } })).toBe(3);
          expect(await tx.storedMealLot.count({ where: { userId } })).toBe(0);
        }
        const submittedCount = (intermediateSave ? liveRemainder : 2) + delta;
        const editedBatch = { ...batch, storageRows: submittedCount ? [{ count: submittedCount, cookingFamilyMemberIds: [] }] : [] };
        expect(await updatePlan(userId, source.plan.id, completedSource, { expectedVersion: version }, [editedBatch])).toEqual({ type: "success", version: version + 1 });
        version += 1;
        expect(await tx.rollingMealUnit.findUniqueOrThrow({ where: { id: moved.id } })).toMatchObject({
          state: "PENDING", currentPlanId: destination.plan.id, placementId: "destination",
        });
        expect(await tx.rollingMealUnit.count({ where: { entryId: entry.id, state: "CONVERTED" } })).toBe(remainder);
        expect(await tx.rollingMealUnit.count({ where: { entryId: entry.id, state: "COMPLETED" } })).toBe(1);
        expect(await listRollingMealQueue(userId)).toEqual([expect.objectContaining({ count: 1 + released })]);
        expect(await tx.rollingMealUnit.count({ where: { entryId: entry.id, state: "PENDING", currentPlanId: null } })).toBe(released);
        expect(await tx.planSlot.findMany({ where: { planId: destination.plan.id } })).toEqual(destinationSnapshot);
        const lots = await tx.storedMealLot.findMany({ where: { userId } });
        expect(lots).toEqual(remainder ? [expect.objectContaining({ count: remainder, sourcePlanId: source.plan.id })] : []);
        expect(await updatePlan(userId, source.plan.id, completedSource, { expectedVersion: version }, [batch])).toEqual({ type: "success", version: version + 1 });
        expect(await tx.storedMealLot.findMany({ where: { userId } })).toEqual(lots);
        const sourceSnapshot = await tx.planSlot.findMany({ where: { planId: source.plan.id }, orderBy: { placementId: "asc" } });
        expect(await updatePlan(userId, destination.plan.id, [{
          date: destinationDate, mealType: slot.mealType, recipeId: recipe.id, placementId: "destination",
          customMeal: null, alternativeRecipeIds: [], cookingFamilyMemberIds: [], used: true, isRolledOver: true,
        }], { expectedVersion: 0 })).toEqual({ type: "success", version: 1 });
        expect(await listRollingMealQueue(userId)).toEqual(released ? [expect.objectContaining({ count: released })] : []);
        expect(await tx.rollingMealUnit.count({ where: { entryId: entry.id } })).toBe(2 + remainder + released);
        expect(await tx.rollingMealUnit.count({ where: { entryId: entry.id, state: "COMPLETED" } })).toBe(2);
        expect(await tx.storedMealLot.findMany({ where: { userId } })).toEqual(lots);
        expect(await tx.storedMealEvent.findMany({ where: { userId } })).toEqual(remainder ? [
          expect.objectContaining({ type: "CREATED", quantity: remainder }),
        ] : []);
        expect(await tx.planSlot.findMany({ where: { planId: source.plan.id }, orderBy: { placementId: "asc" } })).toEqual(sourceSnapshot);
        throw rollback;
      }, { timeout: 30000 });
      throw new Error("Fixture transaction unexpectedly committed");
    } catch (error) {
      if (error !== rollback) throw error;
    } finally {
      context.tx = undefined;
      expect(await client.user.findUnique({ where: { id: userId } })).toBeNull();
    }
  }, 40000);

  it("uses the incoming update date to claim a preceding meal instead of an earlier-created future meal", async () => {
    if (!process.env.DATABASE_URL || !client) throw new Error("DATABASE_URL is required");
    const rollback = new Error("intentional fixture rollback");
    const userId = `integration-${randomUUID()}`;
    try {
      await client.$transaction(async (tx) => {
        context.tx = tx;
        await tx.user.create({ data: { id: userId, clerkId: userId } });
        const futureDate = new Date("2040-06-15T00:00:00.000Z");
        const precedingDate = new Date("2040-06-01T00:00:00.000Z");
        const incomingDate = new Date("2040-06-08T00:00:00.000Z");
        const oldDestinationDate = new Date("2040-06-22T00:00:00.000Z");
        const slot: SlotInputType = {
          date: futureDate, mealType: PlannerMealType.DINNER, recipe: null,
          customMeal: { name: "Date-scoped leftovers", ingredients: [] }, alternatives: [],
          used: false, placementId: "original",
        };
        const future = await createPlan(userId, futureDate, futureDate, [slot]);
        const preceding = await createPlan(userId, precedingDate, precedingDate, [{ ...slot, date: precedingDate }]);
        const destination = await createPlan(userId, oldDestinationDate, oldDestinationDate, []);
        if (future.type !== "success" || preceding.type !== "success" || destination.type !== "success") {
          throw new Error("Plan creation failed");
        }
        const futureUnit = await tx.rollingMealUnit.findFirstOrThrow({ where: { sourcePlanId: future.plan.id } });
        await tx.rollingMealUnit.update({ where: { id: futureUnit.id }, data: { createdAt: new Date(0) } });
        const entry = await tx.rollingMealEntry.findFirstOrThrow({ where: { userId } });
        expect(entry.count).toBe(2);
        expect(await updatePlan(userId, destination.plan.id, [{
          date: incomingDate, mealType: slot.mealType, recipeId: null, customMeal: slot.customMeal,
          placementId: "claimed", alternativeRecipeIds: [], cookingFamilyMemberIds: [], used: false,
          isRolledOver: true, rollingQueueClaim: { id: entry.id, version: entry.version },
        }], { expectedVersion: 0 })).toEqual({ type: "success", version: 1 });
        expect(await tx.rollingMealUnit.findFirstOrThrow({ where: { currentPlanId: destination.plan.id } })).toMatchObject({
          sourcePlanId: preceding.plan.id, placementId: "claimed", state: "PENDING",
        });
        expect(await tx.rollingMealUnit.findUniqueOrThrow({ where: { id: futureUnit.id } })).toMatchObject({
          currentPlanId: future.plan.id, placementId: "original", state: "PENDING",
        });
        expect(await tx.plan.findUniqueOrThrow({ where: { id: destination.plan.id } })).toMatchObject({ startDate: incomingDate });
        expect(await tx.rollingMealUnit.count({ where: { entry: { userId } } })).toBe(2);
        throw rollback;
      }, { timeout: 30000 });
      throw new Error("Fixture transaction unexpectedly committed");
    } catch (error) {
      if (error !== rollback) throw error;
    } finally {
      context.tx = undefined;
      expect(await client.user.findUnique({ where: { id: userId } })).toBeNull();
    }
  }, 40000);

  it("transfers stored meals on create and new placements on update, without repeating transfers", async () => {
    if (!process.env.DATABASE_URL || !client) throw new Error("DATABASE_URL is required");
    const [schema] = await client.$queryRaw<{ present: boolean }[]>`SELECT to_regclass('public.plan_batch_remainder_resolutions') IS NOT NULL AS present`;
    if (!schema?.present) throw new Error("Disposable schema is missing public.plan_batch_remainder_resolutions; no fixtures written");
    const rollback = new Error("intentional fixture rollback");
    const fixtureId = `integration-${randomUUID()}`;
    try {
      await client.$transaction(async (tx) => {
        context.tx = tx;
        await tx.user.create({ data: { id: fixtureId, clerkId: fixtureId } });
        const recipe = await tx.recipe.create({ data: {
          userId: fixtureId, name: "Integration fixture", slug: fixtureId,
          handsOnTime: 1, totalTime: 1, notes: [], servings: 1, isBatchRecipe: true,
        } });
        const lot = await tx.storedMealLot.create({ data: { userId: fixtureId, recipeId: recipe.id, count: 2 } });
        const date = new Date("2040-01-01T00:00:00.000Z");
        const placementId = randomUUID();
        const input: SlotInputType = {
          date, mealType: PlannerMealType.DINNER, recipe: { id: recipe.id } as SlotInputType["recipe"],
          customMeal: null, alternatives: [], used: false, placementId, isRolledOver: true, alreadyCooked: true,
        };
        const created = await createPlan(fixtureId, date, date, [input]);
        expect(created.type).toBe("success");
        if (created.type !== "success") throw new Error("Plan creation failed");
        const planId = created.plan.id;
        expect(await tx.storedMealLot.findUniqueOrThrow({ where: { id: lot.id } })).toMatchObject({ count: 1, version: 2 });
        expect(await tx.planSlot.findFirstOrThrow({ where: { planId, placementId } })).toMatchObject({ alreadyCooked: true });
        const secondPlacementId = randomUUID();
        const slots = [
          { date, mealType: PlannerMealType.DINNER, recipeId: recipe.id, placementId, used: false, cookingFamilyMemberIds: [], customMeal: null, alternativeRecipeIds: [] },
          { date, mealType: PlannerMealType.LUNCH, recipeId: recipe.id, placementId: secondPlacementId, used: false, isRolledOver: true, alreadyCooked: true, cookingFamilyMemberIds: [], customMeal: null, alternativeRecipeIds: [] },
        ];
        expect(await updatePlan(fixtureId, planId, slots, { expectedVersion: 0 })).toEqual({ type: "success", version: 1 });
        expect(await tx.storedMealLot.findUnique({ where: { id: lot.id } })).toBeNull();
        expect(await tx.planSlot.count({ where: { planId, alreadyCooked: true } })).toBe(2);
        expect(await updatePlan(fixtureId, planId, slots, { expectedVersion: 1 })).toEqual({ type: "success", version: 2 });
        const events = await tx.storedMealEvent.findMany({ where: { userId: fixtureId }, orderBy: { previousCount: "desc" } });
        expect(events.map((event) => ({
          type: event.type, lotId: event.lotId, sourceLotId: event.sourceLotId,
          placementId: event.placementId, destinationPlanId: event.destinationPlanId,
          previousCount: event.previousCount, nextCount: event.nextCount,
        }))).toEqual([
          { type: "TRANSFERRED", lotId: null, sourceLotId: lot.id, placementId, destinationPlanId: planId, previousCount: 2, nextCount: 1 },
          { type: "TRANSFERRED", lotId: null, sourceLotId: lot.id, placementId: secondPlacementId, destinationPlanId: planId, previousCount: 1, nextCount: 0 },
        ]);
        throw rollback;
      }, { timeout: 30000 });
      throw new Error("Fixture transaction unexpectedly committed");
    } catch (error) {
      if (error !== rollback) throw error;
    } finally {
      context.tx = undefined;
      expect(await client.user.findUnique({ where: { id: fixtureId } })).toBeNull();
    }
  }, 40000);
});
