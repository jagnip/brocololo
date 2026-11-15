import { prisma } from "@/lib/db/index";
import { getRollingCustomMealKey } from "@/lib/planner/custom-meal-identity";
import type { AdjustRollingMealInput, DiscardRollingMealQuantityInput } from "@/lib/validations/rolling-meals";
import type { Prisma } from "@/src/generated/client";
import type { PlannerMealType } from "@/src/generated/enums";
import type { PlanCustomMeal } from "@/types/planner";

export type RollingMealQueueRow = {
  id: string;
  version: number;
  count: number;
  name: string;
} & ({ kind: "recipe"; recipeId: string } | { kind: "custom"; mealType: PlannerMealType; customMeal: PlanCustomMeal });

const entrySelect = {
  id: true, version: true, count: true, recipeId: true, mealType: true,
  customMeal: true, recipe: { select: { name: true } },
} as const;

type Entry = Prisma.RollingMealEntryGetPayload<{ select: typeof entrySelect }>;

function toRow(entry: Entry): RollingMealQueueRow {
  const common = { id: entry.id, version: entry.version, count: entry.count };
  if (entry.recipeId && entry.recipe) {
    return { ...common, kind: "recipe", recipeId: entry.recipeId, name: entry.recipe.name };
  }
  const customMeal = entry.customMeal as PlanCustomMeal;
  return { ...common, kind: "custom", mealType: entry.mealType!, customMeal, name: customMeal.name };
}

const planSelect = {
  id: true,
  slots: {
    select: {
      used: true, alreadyCooked: true, batchGroupId: true,
      recipeId: true, mealType: true, customName: true,
      customIngredients: { orderBy: { position: "asc" }, select: { ingredientId: true, unitId: true, amount: true } },
      recipe: { select: { archivedAt: true, excludeFromPlanner: true } },
    },
  },
  batches: { select: {
    id: true, recipeId: true, recipe: { select: { archivedAt: true, excludeFromPlanner: true } },
    storageRows: { select: { count: true } },
  } },
  resolvedBatchRemainders: { select: { batchId: true } },
} satisfies Prisma.PlanSelect;

type SourcePlan = Prisma.PlanGetPayload<{ select: typeof planSelect }>;
type Source = { identity: string; recipeId: string; count: number } |
  { identity: string; mealType: PlannerMealType; customMeal: PlanCustomMeal; count: number };

async function capturePlans(tx: Prisma.TransactionClient, userId: string, plans: SourcePlan[]) {
  const seen = new Set<string>();
  const entries: Prisma.RollingMealEntryCreateManyInput[] = [];
  for (const plan of plans) {
    const sources = new Map<string, Source>();
    for (const slot of plan.slots) {
      if (slot.recipeId) {
        if (!slot.recipe || slot.recipe.archivedAt || slot.recipe.excludeFromPlanner) continue;
        const identity = `recipe:${slot.recipeId}`;
        const source = sources.get(identity) ?? { identity, recipeId: slot.recipeId, count: 0 };
        if (!slot.used && !slot.alreadyCooked) source.count++;
        sources.set(identity, source);
      } else if (slot.customName) {
        const customMeal = { name: slot.customName, ingredients: slot.customIngredients };
        const identity = `custom:${getRollingCustomMealKey(slot.mealType, customMeal)}`;
        const source = sources.get(identity) ?? { identity, mealType: slot.mealType, customMeal, count: 0 };
        if (!slot.used && !slot.alreadyCooked) source.count++;
        sources.set(identity, source);
      }
    }
    for (const batch of plan.batches) {
      if (batch.recipe.archivedAt || batch.recipe.excludeFromPlanner) continue;
      const identity = `recipe:${batch.recipeId}`;
      const source = sources.get(identity) ?? { identity, recipeId: batch.recipeId, count: 0 };
      const resolved = plan.resolvedBatchRemainders.some((resolution) => resolution.batchId === batch.id);
      if (!resolved) source.count += batch.storageRows.reduce((sum, row) => sum + row.count, 0);
      sources.set(identity, source);
    }
    for (const source of sources.values()) {
      if (seen.has(source.identity)) continue;
      seen.add(source.identity);
      if (source.count > 0) {
        const data = "recipeId" in source
          ? { recipeId: source.recipeId }
          : { mealType: source.mealType, customMeal: source.customMeal };
        entries.push({ userId, identity: source.identity, count: source.count, ...data });
      }
    }
  }
  if (entries.length > 0) {
    await tx.rollingMealEntry.createMany({ data: entries, skipDuplicates: true });
  }
}

async function initialize(tx: Prisma.TransactionClient, userId: string) {
  const state = await tx.rollingQueueState.findUnique({ where: { userId } });
  if (state) return;
  const allPlans = await tx.plan.findMany({
    where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true },
  });
  const plans = await tx.plan.findMany({
    where: { userId, id: { in: allPlans.slice(0, 4).map(({ id }) => id) } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: planSelect,
  });
  await capturePlans(tx, userId, plans);
  await tx.rollingCapturedPlan.createMany({ data: allPlans.map(({ id }) => ({ planId: id, userId })) });
  await tx.rollingQueueState.create({ data: { userId } });
}

async function lockedTransaction<T>(userId: string, operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    return operation(tx);
  });
}

export async function ensureRollingQueueInitialized(userId: string): Promise<void> {
  await lockedTransaction(userId, (tx) => initialize(tx, userId));
}

// The caller must lock the user's row before calling this function.
export async function captureUncapturedPlansForRollingTx(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await initialize(tx, userId);
  const plans = await tx.plan.findMany({
    where: { userId, rollingCapture: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: planSelect,
  });
  await capturePlans(tx, userId, plans);
  await tx.rollingCapturedPlan.createMany({ data: plans.map(({ id }) => ({ planId: id, userId })) });
}

export async function captureUncapturedPlansForRolling(userId: string): Promise<void> {
  await lockedTransaction(userId, (tx) => captureUncapturedPlansForRollingTx(tx, userId));
}

export async function listRollingMealQueue(userId: string): Promise<RollingMealQueueRow[]> {
  const entries = await prisma.rollingMealEntry.findMany({
    where: { userId }, orderBy: { identity: "asc" }, select: entrySelect,
  });
  return entries.map(toRow);
}

async function changeCount(userId: string, input: AdjustRollingMealInput | DiscardRollingMealQuantityInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.rollingMealEntry.findFirst({ where: { id: input.entryId, userId }, select: entrySelect });
    if (!existing) return { type: "not_found" as const };
    if (existing.version !== input.expectedVersion) return { type: "conflict" as const };
    const count = "count" in input ? input.count : existing.count - input.quantity;
    if (count < 0) return { type: "conflict" as const };
    const where = { id: input.entryId, userId, version: input.expectedVersion };
    if (count === 0) {
      const result = await tx.rollingMealEntry.deleteMany({ where });
      return result.count === 1 ? { type: "success" as const, entry: null } : { type: "conflict" as const };
    }
    const result = await tx.rollingMealEntry.updateMany({ where, data: { count, version: { increment: 1 } } });
    if (result.count !== 1) return { type: "conflict" as const };
    return { type: "success" as const, entry: toRow({ ...existing, count, version: existing.version + 1 }) };
  });
}

export async function adjustRollingMeal(userId: string, input: AdjustRollingMealInput) {
  return changeCount(userId, input);
}

export async function discardRollingMealQuantity(userId: string, input: DiscardRollingMealQuantityInput) {
  return changeCount(userId, input);
}
