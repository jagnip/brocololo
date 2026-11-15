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

const enabled = process.env.RUN_POSTGRES_INTEGRATION === "1";
const pool = enabled ? new Pool({ connectionString: process.env.DATABASE_URL }) : undefined;
const client = pool ? new PrismaClient({ adapter: new PrismaPg(pool) }) : undefined;

afterAll(async () => {
  await client?.$disconnect();
  await pool?.end();
});

describe.skipIf(!enabled)("planner PostgreSQL integration", () => {
  it("captures only superseded plans and consumes their rolling meals on a later save", async () => {
    if (!process.env.DATABASE_URL || !client) throw new Error("DATABASE_URL is required");
    const rollback = new Error("intentional fixture rollback");
    const userId = `integration-${randomUUID()}`;
    try {
      await client.$transaction(async (tx) => {
        context.tx = tx;
        await tx.user.create({ data: { id: userId, clerkId: userId } });
        const date = new Date("2040-02-01T00:00:00.000Z");
        const slot: SlotInputType = {
          date, mealType: PlannerMealType.DINNER, recipe: null,
          customMeal: { name: "Soup", ingredients: [] }, alternatives: [], used: false,
        };
        const first = await createPlan(userId, date, date, [slot]);
        if (first.type !== "success") throw new Error("First plan creation failed");
        expect(await tx.rollingMealEntry.count({ where: { userId } })).toBe(0);
        expect(await tx.rollingCapturedPlan.count({ where: { planId: first.plan.id } })).toBe(0);

        const second = await createPlan(userId, date, date, []);
        if (second.type !== "success") throw new Error("Second plan creation failed");
        const entry = await tx.rollingMealEntry.findFirstOrThrow({ where: { userId } });
        expect(entry.count).toBe(1);
        expect(await tx.rollingCapturedPlan.count({ where: { planId: first.plan.id } })).toBe(1);
        expect(await tx.rollingCapturedPlan.count({ where: { planId: second.plan.id } })).toBe(0);

        const third = await createPlan(userId, date, date, [{
          ...slot, isRolledOver: true, rollingQueueClaim: { id: entry.id, version: entry.version, mealType: slot.mealType },
        }]);
        expect(third.type).toBe("success");
        expect(await tx.rollingMealEntry.count({ where: { userId } })).toBe(0);
        expect(await tx.planSlot.findFirstOrThrow({ where: { planId: first.plan.id } })).toMatchObject({ customName: "Soup", used: false });
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
    if (!schema?.present) throw new Error("DEV schema is missing public.plan_batch_remainder_resolutions; no fixtures written");
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
