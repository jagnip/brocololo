import type {
  PlanBatchInput,
  PlanBatchStorageRow,
  PlanInputType,
  SlotInputType,
} from "@/types/planner";
import { getPlanSlotKey } from "@/lib/planner/helpers";

function normalizeAudience(ids: string[]): string[] {
  return [...new Set(ids)].sort();
}

function audienceKey(ids: string[]): string {
  return normalizeAudience(ids).join(",");
}

export function mergeBatchStorageRow(
  rows: PlanBatchStorageRow[],
  memberIds: string[],
  count = 1,
): PlanBatchStorageRow[] {
  if (count <= 0) return rows;
  const normalized = normalizeAudience(memberIds);
  if (normalized.length === 0) return rows;
  const key = audienceKey(normalized);
  const index = rows.findIndex(
    (row) => audienceKey(row.cookingFamilyMemberIds) === key,
  );
  if (index < 0) {
    return [...rows, { count, cookingFamilyMemberIds: normalized }];
  }
  return rows.map((row, rowIndex) =>
    rowIndex === index ? { ...row, count: row.count + count } : row,
  );
}

export function getBatchScheduledSlots(
  plan: PlanInputType,
  batch: Pick<PlanBatchInput, "id" | "recipeId">,
): SlotInputType[] {
  return plan.filter(
    (slot) =>
      slot.batchGroupId === batch.id && slot.recipe?.id === batch.recipeId,
  );
}

export function getBatchMealTotal(
  plan: PlanInputType,
  batch: PlanBatchInput,
): number {
  return (
    getBatchScheduledSlots(plan, batch).length +
    batch.storageRows.reduce((sum, row) => sum + row.count, 0)
  );
}

/**
 * Remove/replace one scheduled meal. It moves to Storage while siblings remain;
 * removing the final scheduled sibling deletes the whole batch and its Storage.
 */
export function detachMealFromBatch(params: {
  plan: PlanInputType;
  batches: PlanBatchInput[];
  slotKey: string;
  fallbackFamilyMemberIds: string[];
}): PlanBatchInput[] {
  const slot = params.plan.find(
    (candidate) => getPlanSlotKey(candidate) === params.slotKey,
  );
  if (!slot?.recipe?.isBatchRecipe || !slot.batchGroupId) {
    return params.batches;
  }

  const siblingCount = params.plan.filter(
    (candidate) =>
      candidate.batchGroupId === slot.batchGroupId &&
      candidate.recipe?.id === slot.recipe?.id,
  ).length;
  if (siblingCount <= 1) {
    return params.batches.filter((batch) => batch.id !== slot.batchGroupId);
  }

  const audience =
    slot.cookingFamilyMemberIds && slot.cookingFamilyMemberIds.length > 0
      ? slot.cookingFamilyMemberIds
      : params.fallbackFamilyMemberIds;
  const existing = params.batches.find((batch) => batch.id === slot.batchGroupId);
  const next: PlanBatchInput = existing ?? {
    id: slot.batchGroupId,
    recipeId: slot.recipe.id,
    storageRows: [],
    extraPortions: 0,
  };
  const updated = {
    ...next,
    storageRows: mergeBatchStorageRow(next.storageRows, audience),
  };
  return existing
    ? params.batches.map((batch) => (batch.id === updated.id ? updated : batch))
    : [...params.batches, updated];
}

export function pruneBatchesWithoutScheduledMeals(
  plan: PlanInputType,
  batches: PlanBatchInput[],
): PlanBatchInput[] {
  return batches.filter(
    (batch) => getBatchScheduledSlots(plan, batch).length > 0,
  );
}

/** Move batch meals lost during date-range rescue into Storage by audience. */
export function transferRangeRemovedBatchMeals(params: {
  previousPlan: PlanInputType;
  nextPlan: PlanInputType;
  batches: PlanBatchInput[];
  fallbackFamilyMemberIds: string[];
}): PlanBatchInput[] {
  let nextBatches = params.batches;
  for (const batch of params.batches) {
    const previousSlots = getBatchScheduledSlots(params.previousPlan, batch);
    const nextSlots = getBatchScheduledSlots(params.nextPlan, batch);
    if (nextSlots.length === 0) continue;

    const remainingByAudience = new Map<string, number>();
    for (const slot of nextSlots) {
      const ids =
        slot.cookingFamilyMemberIds?.length
          ? slot.cookingFamilyMemberIds
          : params.fallbackFamilyMemberIds;
      const key = audienceKey(ids);
      remainingByAudience.set(key, (remainingByAudience.get(key) ?? 0) + 1);
    }

    let rows = batch.storageRows;
    for (const slot of previousSlots) {
      const ids =
        slot.cookingFamilyMemberIds?.length
          ? slot.cookingFamilyMemberIds
          : params.fallbackFamilyMemberIds;
      const key = audienceKey(ids);
      const remaining = remainingByAudience.get(key) ?? 0;
      if (remaining > 0) {
        remainingByAudience.set(key, remaining - 1);
      } else {
        rows = mergeBatchStorageRow(rows, ids);
      }
    }
    if (rows !== batch.storageRows) {
      nextBatches = nextBatches.map((item) =>
        item.id === batch.id ? { ...item, storageRows: rows } : item,
      );
    }
  }
  return pruneBatchesWithoutScheduledMeals(params.nextPlan, nextBatches);
}

/** Create metadata for a newly placed batch and put unplaced requested meals in Storage. */
export function ensureBatchForPlacement(params: {
  plan: PlanInputType;
  batches: PlanBatchInput[];
  batchGroupId: string;
  recipeId: string;
  requestedMeals: number;
  cookingFamilyMemberIds: string[];
}): PlanBatchInput[] {
  if (params.batches.some((batch) => batch.id === params.batchGroupId)) {
    return params.batches;
  }
  const scheduledCount = params.plan.filter(
    (slot) =>
      slot.batchGroupId === params.batchGroupId &&
      slot.recipe?.id === params.recipeId,
  ).length;
  const missing = Math.max(params.requestedMeals - scheduledCount, 0);
  return [
    ...params.batches,
    {
      id: params.batchGroupId,
      recipeId: params.recipeId,
      storageRows:
        missing > 0
          ? [
              {
                count: missing,
                cookingFamilyMemberIds: normalizeAudience(
                  params.cookingFamilyMemberIds,
                ),
              },
            ]
          : [],
      extraPortions: 0,
    },
  ];
}

export function ensureBatchAfterPlacement(params: {
  previousPlan?: PlanInputType;
  plan: PlanInputType;
  batches: PlanBatchInput[];
  slotKey: string;
  requestedMeals: number;
  fallbackFamilyMemberIds: string[];
}): PlanBatchInput[] {
  const slot = params.plan.find(
    (candidate) => getPlanSlotKey(candidate) === params.slotKey,
  );
  if (!slot?.recipe?.isBatchRecipe || !slot.batchGroupId) {
    return pruneBatchesWithoutScheduledMeals(params.plan, params.batches);
  }
  const audience =
    slot.cookingFamilyMemberIds && slot.cookingFamilyMemberIds.length > 0
      ? slot.cookingFamilyMemberIds
      : params.fallbackFamilyMemberIds;
  const existing = params.batches.find(
    (batch) => batch.id === slot.batchGroupId,
  );
  if (existing && params.previousPlan) {
    const previousScheduled = getBatchScheduledSlots(
      params.previousPlan,
      existing,
    ).length;
    const nextScheduled = getBatchScheduledSlots(params.plan, existing).length;
    let toConsume = Math.max(nextScheduled - previousScheduled, 0);
    if (toConsume > 0) {
      const preferredKey = audienceKey(audience);
      const counts = existing.storageRows.map((row) => row.count);
      const consumeFrom = (preferred: boolean) => {
        existing.storageRows.forEach((row, index) => {
          if (toConsume === 0) return;
          if (
            (audienceKey(row.cookingFamilyMemberIds) === preferredKey) !==
            preferred
          ) {
            return;
          }
          const consumed = Math.min(counts[index] ?? 0, toConsume);
          counts[index] = (counts[index] ?? 0) - consumed;
          toConsume -= consumed;
        });
      };
      consumeFrom(true);
      consumeFrom(false);
      const remainingRows = existing.storageRows.flatMap((row, index) =>
        (counts[index] ?? 0) > 0
          ? [{ ...row, count: counts[index]! }]
          : [],
      );
      const updated = { ...existing, storageRows: remainingRows };
      return params.batches.map((batch) =>
        batch.id === existing.id ? updated : batch,
      );
    }
    return params.batches;
  }
  return ensureBatchForPlacement({
    plan: params.plan,
    batches: pruneBatchesWithoutScheduledMeals(params.plan, params.batches),
    batchGroupId: slot.batchGroupId,
    recipeId: slot.recipe.id,
    requestedMeals: params.requestedMeals,
    cookingFamilyMemberIds: audience,
  });
}
