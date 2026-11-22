import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/index";
import { getRollingCustomMealKey } from "@/lib/planner/custom-meal-identity";
import type { AdjustRollingMealInput, DiscardRollingMealQuantityInput } from "@/lib/validations/rolling-meals";
import type { Prisma, RollingMealUnit } from "@/src/generated/client";
import type { PlannerMealType } from "@/src/generated/enums";
import type { PlanCustomMeal, RollingQueueClaim } from "@/types/planner";

export type RollingMealQueueRow = {
  id: string;
  version: number;
  count: number;
  name: string;
} & ({ kind: "recipe"; recipeId: string } | { kind: "custom"; mealType: PlannerMealType; customMeal: PlanCustomMeal });

export class RollingMigrationRequiredError extends Error {
  readonly code = "ROLLING_MIGRATION_REQUIRED";
  constructor() {
    super("ROLLING_MIGRATION_REQUIRED");
    this.name = "RollingMigrationRequiredError";
  }
}

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

async function lifecycleReady(tx: Prisma.TransactionClient, userId: string, initialize: boolean) {
  const state = await tx.rollingQueueState.findUnique({ where: { userId } });
  if (state?.lifecycleVersion === 1) return;
  if (state || await tx.plan.findFirst({ where: { userId }, select: { id: true } }) ||
      await tx.rollingMealEntry.findFirst({ where: { userId }, select: { id: true } }) ||
      await tx.rollingCapturedPlan.findFirst({ where: { userId }, select: { planId: true } })) {
    throw new RollingMigrationRequiredError();
  }
  if (initialize) await tx.rollingQueueState.create({ data: { userId, lifecycleVersion: 1 } });
}

// Caller holds the user row lock. Call before inserting a new account's first plan.
export async function ensureRollingLifecycleTx(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await lifecycleReady(tx, userId, true);
}

async function lockedTransaction<T>(userId: string, operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    return operation(tx);
  });
}

export async function listRollingMealQueue(userId: string, options: { includeCurrent?: boolean; beforeDate?: Date } = {}): Promise<RollingMealQueueRow[]> {
  return prisma.$transaction(async (tx) => {
    await lifecycleReady(tx, userId, false);
    const precedingPlans = options.beforeDate ? await tx.plan.findMany({
      where: { userId, endDate: { lt: options.beforeDate } }, select: { id: true },
    }) : null;
    const entries = await tx.rollingMealEntry.findMany({
      where: { userId }, orderBy: { identity: "asc" },
      select: { ...entrySelect, _count: { select: { units: { where: {
        state: "PENDING", ...(options.includeCurrent ? {} : { eligible: true }),
        ...(precedingPlans ? { OR: [
          { currentPlanId: null }, { currentPlanId: { in: precedingPlans.map(({ id }) => id) } },
        ] } : {}),
      } } } } },
    });
    return entries.filter((entry) => entry._count.units > 0)
      .map((entry) => toRow({ ...entry, count: entry._count.units }));
  }, { isolationLevel: "RepeatableRead" });
}

async function refreshEntries(tx: Prisma.TransactionClient, ids: Iterable<string>) {
  for (const id of new Set(ids)) {
    const count = await tx.rollingMealUnit.count({ where: { entryId: id, state: "PENDING", eligible: true } });
    await tx.rollingMealEntry.update({ where: { id }, data: { count, version: { increment: 1 } } });
  }
}

export type RollingPlanSlot = {
  placementId?: string | null;
  recipeId: string | null;
  customMeal?: PlanCustomMeal | null;
  mealType: PlannerMealType;
  used: boolean;
  alreadyCooked?: boolean;
  isRolledOver?: boolean;
  batchGroupId?: string | null;
  rollingQueueClaim?: RollingQueueClaim | null;
};
export type RollingPlanBatch = {
  id: string;
  recipeId: string;
  storageRows: { count: number; cookingFamilyMemberIds: string[] }[];
  rollingQueueClaim?: RollingQueueClaim | null;
};
export type RollingPlanSyncOptions = {
  create?: boolean;
  startDate?: Date;
  convertedBatchIds?: string[];
  resolvedBatchIds?: string[];
};

function identityOf(recipeId: string | null, mealType?: PlannerMealType, customMeal?: PlanCustomMeal | null) {
  if (recipeId) return `recipe:${recipeId}`;
  if (mealType && customMeal) return `custom:${getRollingCustomMealKey(mealType, customMeal)}`;
  throw new Error("ROLLING_INVALID_IDENTITY");
}

// Read-only. Normalize raw submitted rows once against the persisted snapshot;
// use the result for lifecycle reconciliation, conversion, and row persistence.
export async function reconcileRollingBatchRemaindersTx<T extends RollingPlanBatch>(
  tx: Prisma.TransactionClient, userId: string, planId: string,
  batches: readonly T[], existingBatches: readonly RollingPlanBatch[],
): Promise<T[]> {
  await lifecycleReady(tx, userId, false);
  if (!await tx.plan.findFirst({ where: { id: planId, userId }, select: { id: true } })) {
    throw new Error("ROLLING_PLAN_NOT_FOUND");
  }
  const entries = await tx.rollingMealEntry.findMany({ where: { userId }, include: { units: true } });
  const mappings = await tx.rollingMealPlacement.findMany({ where: { planId, unit: { entry: { userId } } } });
  const previous = new Map(existingBatches.map((batch) => [batch.id, batch]));
  if (previous.size !== existingBatches.length || new Set(batches.map((batch) => batch.id)).size !== batches.length) {
    throw new Error("ROLLING_INVALID_PLACEMENT");
  }
  return batches.map((batch) => {
    const existing = previous.get(batch.id);
    const submitted = batch.storageRows.reduce((sum, row) => sum + row.count, 0);
    const baseline = existing?.storageRows.reduce((sum, row) => sum + row.count, 0) ?? 0;
    if (![submitted, baseline].every((count) => Number.isSafeInteger(count) && count >= 0) ||
        [...batch.storageRows, ...(existing?.storageRows ?? [])].some((row) => !Number.isSafeInteger(row.count) || row.count < 0)) {
      throw new Error("ROLLING_INVALID_QUANTITY");
    }
    const units = entries.filter((entry) => entry.recipeId === batch.recipeId).flatMap((entry) => entry.units);
    const assigned = units.filter((unit) => unit.currentPlanId === planId && unit.batchId === batch.id);
    const tracked = assigned.length > 0 || mappings.some((mapping) => mapping.batchId === batch.id);
    if (!existing || existing.recipeId !== batch.recipeId || !tracked) return batch;
    const live = assigned.filter((unit) => unit.state === "PENDING" && unit.placementId === null).length;
    const target = Math.max(0, live + submitted - baseline);
    if (!Number.isSafeInteger(target)) throw new Error("ROLLING_INVALID_QUANTITY");
    if (target === submitted) return batch;
    let remaining = target;
    const storageRows = batch.storageRows.map((row) => {
      const count = Math.min(row.count, remaining);
      remaining -= count;
      return { ...row, count, cookingFamilyMemberIds: [...row.cookingFamilyMemberIds] };
    }).filter((row) => row.count > 0);
    if (remaining > 0) {
      const audience = batch.storageRows.at(-1) ?? existing.storageRows.at(-1);
      storageRows.push({ ...audience, count: remaining, cookingFamilyMemberIds: [...(audience?.cookingFamilyMemberIds ?? [])] });
    }
    return { ...batch, storageRows };
  });
}

// Caller locks the user and reconciles cooked lots in this same transaction.
export async function syncRollingPlanTx(
  tx: Prisma.TransactionClient, userId: string, planId: string,
  slots: RollingPlanSlot[], batches: RollingPlanBatch[], options: RollingPlanSyncOptions = {},
): Promise<void> {
  await ensureRollingLifecycleTx(tx, userId);
  const plan = await tx.plan.findFirst({ where: { id: planId, userId }, select: {
    id: true, startDate: true, resolvedBatchRemainders: { select: { batchId: true } },
  } });
  if (!plan) throw new Error("ROLLING_PLAN_NOT_FOUND");
  const placementIds = slots.filter((slot) => slot.recipeId || slot.customMeal).map((slot) => slot.placementId);
  if (placementIds.some((id) => !id || id.startsWith("rolling-remainder:")) || new Set(placementIds).size !== placementIds.length ||
      new Set(batches.map((batch) => batch.id)).size !== batches.length) throw new Error("ROLLING_INVALID_PLACEMENT");

  const entries = await tx.rollingMealEntry.findMany({ where: { userId }, include: { units: true } });
  const byIdentity = new Map(entries.map((entry) => [entry.identity, entry]));
  const units = entries.flatMap((entry) => entry.units);
  units.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  const original = new Map(units.map((unit) => [unit.id, JSON.stringify(unit)]));
  const previousAssignments = units.filter((unit) => unit.state === "PENDING" && unit.placementId && unit.batchId)
    .map((unit) => ({ id: unit.id, planId: unit.currentPlanId, batchId: unit.batchId }));
  const mappings = await tx.rollingMealPlacement.findMany({ where: { planId, unit: { entry: { userId } } } });
  const byPlacement = new Map(mappings.map((mapping) => [mapping.placementId, mapping]));
  const touched = new Set<string>();
  const selected = new Set<string>();
  const claimedVersions = new Map<string, number>();
  const mappingWrites: { placementId: string; unitId: string; batchId: string | null }[] = [];
  const mappingKeys = new Set(mappings.map((mapping) => mapping.placementId));
  const converted = new Set(options.convertedBatchIds ?? []);
  const persistedResolved = new Set([
    ...(plan.resolvedBatchRemainders ?? []).map(({ batchId }) => batchId),
    ...units.filter((unit) => unit.currentPlanId === planId && unit.placementId === null &&
      unit.batchId && (unit.state === "CONVERTED" || unit.state === "DISCARDED")).map((unit) => unit.batchId!),
  ]);
  const resolved = new Set([
    ...(options.resolvedBatchIds ?? []), ...converted,
    ...persistedResolved,
  ]);
  function verifyConvertedAssignments() {
    for (const batchId of converted) {
      const members = units.filter((unit) => unit.currentPlanId === planId && unit.batchId === batchId && unit.placementId !== null);
      if (!batches.some((batch) => batch.id === batchId) || members.length === 0 ||
          members.some((unit) => unit.state !== "COMPLETED")) {
        throw new Error("ROLLING_QUEUE_CONFLICT");
      }
    }
  }

  const older = await tx.plan.findMany({
    where: { userId, id: { not: planId }, endDate: { lt: options.startDate ?? plan.startDate } }, select: { id: true },
  });
  const superseded = new Set(older.map(({ id }) => id));
  if (options.create) {
    for (const unit of units) {
      if (unit.state === "PENDING" && unit.currentPlanId && superseded.has(unit.currentPlanId)) unit.eligible = true;
    }
  }

  async function group(recipeId: string | null, mealType?: PlannerMealType, customMeal?: PlanCustomMeal | null) {
    const identity = identityOf(recipeId, mealType, customMeal);
    const existing = byIdentity.get(identity);
    if (existing) return existing;
    if (recipeId && !await tx.recipe.findFirst({ where: { id: recipeId, userId }, select: { id: true } })) {
      throw new Error("ROLLING_INVALID_IDENTITY");
    }
    const entry = await tx.rollingMealEntry.create({ data: {
      userId, identity, count: 0,
      ...(recipeId ? { recipeId } : { mealType, customMeal: customMeal as Prisma.InputJsonValue }),
    }, include: { units: true } });
    byIdentity.set(identity, entry);
    return entry;
  }

  function claim(entryId: string, token: RollingQueueClaim): RollingMealUnit {
    const entry = entries.find((candidate) => candidate.id === token.id);
    if (!entry || entry.id !== entryId || entry.version !== token.version ||
        (claimedVersions.has(token.id) && claimedVersions.get(token.id) !== token.version)) {
      throw new Error("ROLLING_QUEUE_CONFLICT");
    }
    claimedVersions.set(token.id, token.version);
    const unit = units.find((candidate) => original.has(candidate.id) && candidate.entryId === entryId && candidate.state === "PENDING" &&
      (!candidate.currentPlanId || candidate.currentPlanId === planId || superseded.has(candidate.currentPlanId)) &&
      !selected.has(candidate.id) && !(candidate.currentPlanId === planId && candidate.placementId &&
        placementIds.includes(candidate.placementId)));
    if (!unit) throw new Error("ROLLING_QUEUE_CONFLICT");
    unit.eligible = true;
    return unit;
  }

  function fresh(entryId: string, placementId: string | null, batchId: string | null): RollingMealUnit {
    const unit: RollingMealUnit = {
      id: randomUUID(), entryId, state: "PENDING", eligible: false, currentPlanId: planId, placementId,
      batchId, sourcePlanId: planId, sourcePlacementId: placementId, createdAt: new Date(), completedAt: null,
    };
    units.push(unit);
    return unit;
  }

  function mapRemainder(unit: RollingMealUnit, batchId: string) {
    if (mappings.some((mapping) => mapping.unitId === unit.id && mapping.batchId === batchId &&
        mapping.placementId.startsWith("rolling-remainder:")) ||
        mappingWrites.some((mapping) => mapping.unitId === unit.id && mapping.batchId === batchId &&
          mapping.placementId.startsWith("rolling-remainder:"))) return;
    const base = `rolling-remainder:${batchId}:${unit.id}`;
    let placementId = base;
    let suffix = 0;
    while (mappingKeys.has(placementId)) placementId = `${base}:${++suffix}`;
    mappingKeys.add(placementId);
    mappingWrites.push({ placementId, unitId: unit.id, batchId });
  }

  for (const slot of slots) {
    if (!slot.recipeId && !slot.customMeal) continue;
    const placementId = slot.placementId!;
    const mapping = byPlacement.get(placementId);
    let unit = mapping ? units.find((candidate) => candidate.id === mapping.unitId) : undefined;
    const unitEntryId = unit?.entryId;
    const mappedEntry = entries.find((entry) => entry.id === unitEntryId);
    let mealType = slot.mealType;
    if (!slot.recipeId && slot.customMeal) {
      const token = slot.rollingQueueClaim;
      const source = token ? entries.find((entry) => entry.id === token.id) : undefined;
      if (token) {
        if (!source || source.recipeId || !source.mealType ||
            (token.mealType && token.mealType !== source.mealType) ||
            identityOf(null, source.mealType, slot.customMeal) !== source.identity) {
          throw new Error("ROLLING_QUEUE_CONFLICT");
        }
        mealType = token.mealType ?? source.mealType;
      } else if (mappedEntry?.mealType && identityOf(null, mappedEntry.mealType, slot.customMeal) === mappedEntry.identity) {
        mealType = mappedEntry.mealType;
      }
    }
    const identity = identityOf(slot.recipeId, mealType, slot.customMeal);
    const restoring = unit?.state === "PENDING" && unit.currentPlanId === null && !selected.has(unit.id) && mappedEntry?.identity === identity;
    // Preserve historical checkboxes, but never silently save an untracked replacement.
    if (unit && !restoring && (unit.currentPlanId !== planId || unit.placementId !== placementId)) {
      if (mappedEntry?.identity !== identity) {
        throw new Error("ROLLING_QUEUE_CONFLICT");
      }
      continue;
    }
    if (slot.alreadyCooked && slot.rollingQueueClaim && !mapping) throw new Error("ROLLING_QUEUE_CONFLICT");
    if (slot.alreadyCooked && !unit) continue;
    if (unit?.batchId && resolved.has(unit.batchId) && unit.batchId !== (slot.batchGroupId ?? null)) {
      throw new Error("ROLLING_QUEUE_CONFLICT");
    }
    const entry = await group(slot.recipeId, mealType, slot.customMeal);
    if (unit && unit.entryId !== entry.id) {
      unit.currentPlanId = null; unit.placementId = null; unit.batchId = null;
      if (unit.state === "PENDING") unit.eligible = true;
      unit = undefined;
    }
    if (slot.alreadyCooked && !unit) continue;
    if (!unit) {
      if (slot.rollingQueueClaim) unit = claim(entry.id, slot.rollingQueueClaim);
      else {
        unit = units.find((candidate) => candidate.entryId === entry.id && candidate.state === "PENDING" &&
          candidate.currentPlanId === planId && candidate.placementId === null &&
          candidate.batchId === (slot.batchGroupId ?? null) && !!candidate.batchId && !selected.has(candidate.id));
        if (!unit && slot.isRolledOver) throw new Error("ROLLING_QUEUE_CONFLICT");
        unit ??= fresh(entry.id, placementId, slot.batchGroupId ?? null);
      }
    }
    selected.add(unit.id);
    const wasResolved = !!unit.batchId && resolved.has(unit.batchId);
    unit.currentPlanId = planId; unit.placementId = placementId; unit.batchId = slot.batchGroupId ?? null;
    if (unit.state === "PENDING" && (slot.used || slot.alreadyCooked)) {
      unit.state = "COMPLETED"; unit.completedAt = new Date();
    } else if (unit.state === "COMPLETED" && !slot.used && !slot.alreadyCooked && !wasResolved) {
      unit.state = "PENDING"; unit.completedAt = null;
    }
    if (!mapping || mapping.unitId !== unit.id || mapping.batchId !== unit.batchId) {
      mappingWrites.push({ placementId, unitId: unit.id, batchId: unit.batchId });
    }
  }

  for (const batch of batches) {
    const count = batch.storageRows.reduce((sum, row) => sum + row.count, 0);
    if (!Number.isSafeInteger(count) || count < 0 || batch.storageRows.some((row) => !Number.isSafeInteger(row.count) || row.count < 0)) {
      throw new Error("ROLLING_INVALID_QUANTITY");
    }
    const entry = await group(batch.recipeId);
    const pool = units.filter((unit) => unit.entryId === entry.id && unit.currentPlanId === planId &&
      unit.batchId === batch.id && unit.placementId === null);
    const history = mappings.filter((mapping) => mapping.batchId === batch.id && mapping.placementId.startsWith("rolling-remainder:"));
    if (persistedResolved.has(batch.id) || (resolved.has(batch.id) && !converted.has(batch.id))) {
      if (converted.has(batch.id) && pool.filter((unit) => unit.state === "CONVERTED").length !== count) {
        throw new Error("ROLLING_QUEUE_CONFLICT");
      }
      continue;
    }
    // Terminal remainder records are barriers, even if a stale client resends rows.
    if (pool.some((unit) => unit.state !== "PENDING")) continue;
    const historical = history.some((mapping) => {
      const unit = units.find((candidate) => candidate.id === mapping.unitId);
      return !unit || unit.currentPlanId !== planId || unit.batchId !== batch.id;
    });
    const hasScheduledMember = units.some((unit) => unit.currentPlanId === planId && unit.batchId === batch.id && unit.placementId !== null);
    const target = historical && !hasScheduledMember && !converted.has(batch.id) ? Math.min(count, pool.length) : count;
    for (let index = 0; index < target; index++) {
      const unit = pool[index] ?? (batch.rollingQueueClaim ? claim(entry.id, batch.rollingQueueClaim) : fresh(entry.id, null, batch.id));
      selected.add(unit.id);
      unit.currentPlanId = planId; unit.placementId = null; unit.batchId = batch.id;
      if (converted.has(batch.id)) {
        unit.state = "CONVERTED"; unit.completedAt = new Date();
      }
      mapRemainder(unit, batch.id);
    }
  }

  for (const unit of units) {
    if (unit.currentPlanId === planId && unit.state === "PENDING" && !selected.has(unit.id)) {
      if (unit.placementId === null && unit.batchId && resolved.has(unit.batchId) && !converted.has(unit.batchId)) {
        unit.state = "DISCARDED";
        unit.completedAt = new Date();
      } else {
        unit.currentPlanId = null; unit.placementId = null; unit.batchId = null; unit.eligible = true;
      }
    }
  }
  for (const previous of previousAssignments) {
    const current = units.find((unit) => unit.id === previous.id)!;
    if ((current.currentPlanId !== previous.planId || current.batchId !== previous.batchId || !current.placementId) &&
        units.some((unit) => unit.state === "PENDING" && unit.currentPlanId === previous.planId &&
          unit.batchId === previous.batchId && unit.placementId === null) &&
        !units.some((unit) => unit.currentPlanId === previous.planId && unit.batchId === previous.batchId &&
          unit.placementId !== null && (unit.state === "PENDING" || unit.state === "COMPLETED"))) {
      throw new Error("ROLLING_BATCH_REMAINDER_REQUIRED");
    }
  }
  verifyConvertedAssignments();
  // Clear old pointers first so swapping destinations cannot violate uniqueness.
  for (const unit of units) {
    if (original.has(unit.id) && original.get(unit.id) !== JSON.stringify(unit)) {
      await tx.rollingMealUnit.update({ where: { id: unit.id }, data: { currentPlanId: null, placementId: null, batchId: null } });
    }
  }
  for (const unit of units) {
    if (original.get(unit.id) === JSON.stringify(unit)) continue;
    touched.add(unit.entryId);
    if (original.has(unit.id)) {
      const { id, ...data } = unit;
      await tx.rollingMealUnit.update({ where: { id }, data });
    } else await tx.rollingMealUnit.create({ data: unit });
  }
  for (const mapping of mappingWrites) {
    await tx.rollingMealPlacement.upsert({
      where: { planId_placementId: { planId, placementId: mapping.placementId } },
      create: { planId, ...mapping }, update: { unitId: mapping.unitId, batchId: mapping.batchId },
    });
  }
  await refreshEntries(tx, touched);
}

// Call before deleting the plan, under the same user lock and transaction.
export async function deleteRollingPlanTx(tx: Prisma.TransactionClient, userId: string, planId: string): Promise<void> {
  await syncRollingPlanTx(tx, userId, planId, [], []);
}

// Call before creating cooked lots; sync also rechecks this before committing conversion.
export async function verifyRollingBatchAssignmentsTx(
  tx: Prisma.TransactionClient, userId: string, planId: string, batchIds: string[],
): Promise<void> {
  await ensureRollingLifecycleTx(tx, userId);
  if (!await tx.plan.findFirst({ where: { id: planId, userId }, select: { id: true } })) {
    throw new Error("ROLLING_PLAN_NOT_FOUND");
  }
  const mappings = await tx.rollingMealPlacement.findMany({
    where: { planId, batchId: { in: batchIds }, unit: { entry: { userId } } },
    include: { unit: { select: { currentPlanId: true, placementId: true, batchId: true } } },
  });
  for (const batchId of batchIds) {
    const history = mappings.filter((mapping) => mapping.batchId === batchId);
    if (history.length > 0 && !history.some((mapping) => !mapping.placementId.startsWith("rolling-remainder:") &&
      mapping.unit.currentPlanId === planId && mapping.unit.batchId === batchId && mapping.unit.placementId === mapping.placementId)) {
      throw new Error("ROLLING_QUEUE_CONFLICT");
    }
  }
}

async function changeCount(userId: string, input: AdjustRollingMealInput | DiscardRollingMealQuantityInput) {
  return lockedTransaction(userId, async (tx) => {
    await ensureRollingLifecycleTx(tx, userId);
    const existing = await tx.rollingMealEntry.findFirst({ where: { id: input.entryId, userId }, select: entrySelect });
    if (!existing) return { type: "not_found" as const };
    if (existing.version !== input.expectedVersion) return { type: "conflict" as const };
    const count = "count" in input ? input.count : existing.count - input.quantity;
    if (!Number.isSafeInteger(count) || count < 0) return { type: "conflict" as const };
    const delta = count - existing.count;
    if (delta < 0) {
      const candidates = await tx.rollingMealUnit.findMany({
        where: { entryId: existing.id, state: "PENDING", eligible: true, currentPlanId: null },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: -delta,
      });
      if (candidates.length !== -delta) return { type: "conflict" as const };
      await tx.rollingMealUnit.updateMany({ where: { id: { in: candidates.map(({ id }) => id) } },
        data: { state: "DISCARDED", completedAt: new Date() } });
    } else if (delta > 0) {
      await tx.rollingMealUnit.createMany({ data: Array.from({ length: delta }, () => ({ entryId: existing.id, eligible: true })) });
    }
    if (delta !== 0) await refreshEntries(tx, [existing.id]);
    return { type: "success" as const, entry: count === 0 ? null : toRow({ ...existing, count, version: existing.version + (delta === 0 ? 0 : 1) }) };
  });
}

export async function adjustRollingMeal(userId: string, input: AdjustRollingMealInput) {
  return changeCount(userId, input);
}

export async function discardRollingMealQuantity(userId: string, input: DiscardRollingMealQuantityInput) {
  return changeCount(userId, input);
}
