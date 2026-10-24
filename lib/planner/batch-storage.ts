import type { PlanBatchInput, PlanInputType, SlotInputType } from "@/types/planner";
import { getPlanSlotKey } from "@/lib/planner/helpers";

function getAudienceKey(memberIds: string[]): string {
  return [...new Set(memberIds)].sort().join(",");
}

function consumeStorageMeals(
  storageRows: PlanBatchInput["storageRows"],
  count: number,
  preferredAudienceIds: string[],
): PlanBatchInput["storageRows"] {
  if (count <= 0) return storageRows;

  const rows = storageRows.map((row) => ({
    ...row,
    cookingFamilyMemberIds: [...row.cookingFamilyMemberIds],
  }));
  const preferredAudienceKey = getAudienceKey(preferredAudienceIds);
  const matchingIndexes: number[] = [];
  const otherIndexes: number[] = [];

  rows.forEach((row, index) => {
    if (getAudienceKey(row.cookingFamilyMemberIds) === preferredAudienceKey) {
      matchingIndexes.push(index);
    } else {
      otherIndexes.push(index);
    }
  });

  let remaining = count;
  for (const index of [...matchingIndexes, ...otherIndexes]) {
    if (remaining === 0) break;
    const consumed = Math.min(rows[index]!.count, remaining);
    rows[index]!.count -= consumed;
    remaining -= consumed;
  }

  return rows.filter((row) => row.count > 0);
}

export function getBatchScheduledSlots(
  plan: PlanInputType,
  batch: Pick<PlanBatchInput, "id" | "recipeId">,
): SlotInputType[] {
  return plan.filter(
    (slot) => slot.batchGroupId === batch.id && slot.recipe?.id === batch.recipeId,
  );
}

export function getBatchMealTotal(plan: PlanInputType, batch: PlanBatchInput): number {
  const scheduled = getBatchScheduledSlots(plan, batch);
  return scheduled.length + (scheduled.some((slot) => slot.alreadyCooked)
    ? 0
    : batch.storageRows.reduce((sum, row) => sum + row.count, 0));
}

/** Detaching a meal never creates storage; the final sibling removes metadata. */
export function detachMealFromBatch(params: {
  plan: PlanInputType;
  batches: PlanBatchInput[];
  slotKey: string;
  fallbackFamilyMemberIds: string[];
}): PlanBatchInput[] {
  const slot = params.plan.find((candidate) => getPlanSlotKey(candidate) === params.slotKey);
  if (!slot?.recipe?.isBatchRecipe || !slot.batchGroupId) return params.batches;
  const siblings = getBatchScheduledSlots(params.plan, {
    id: slot.batchGroupId,
    recipeId: slot.recipe.id,
  });
  return siblings.length <= 1
    ? params.batches.filter((batch) => batch.id !== slot.batchGroupId)
    : params.batches;
}

export function pruneBatchesWithoutScheduledMeals(
  plan: PlanInputType,
  batches: PlanBatchInput[],
): PlanBatchInput[] {
  return batches.filter((batch) => getBatchScheduledSlots(plan, batch).length > 0);
}

export function transferRangeRemovedBatchMeals(params: {
  previousPlan: PlanInputType;
  nextPlan: PlanInputType;
  batches: PlanBatchInput[];
  fallbackFamilyMemberIds: string[];
}): PlanBatchInput[] {
  return pruneBatchesWithoutScheduledMeals(params.nextPlan, params.batches);
}

/** Create a batch's initial Storage remainder after manual placement. */
export function ensureBatchForPlacement(params: {
  plan: PlanInputType;
  batches: PlanBatchInput[];
  batchGroupId: string;
  recipeId: string;
  requestedMeals: number;
  cookingFamilyMemberIds: string[];
}): PlanBatchInput[] {
  if (params.batches.some((batch) => batch.id === params.batchGroupId && batch.recipeId === params.recipeId)) {
    return params.batches;
  }
  if (getBatchScheduledSlots(params.plan, { id: params.batchGroupId, recipeId: params.recipeId }).length === 0) {
    return params.batches;
  }
  const scheduledCount = getBatchScheduledSlots(params.plan, {
    id: params.batchGroupId,
    recipeId: params.recipeId,
  }).length;
  const storageCount = Math.max(params.requestedMeals - scheduledCount, 0);
  return [
    ...params.batches.filter((batch) => batch.id !== params.batchGroupId),
    {
      id: params.batchGroupId,
      recipeId: params.recipeId,
      storageRows: storageCount > 0
        ? [{ count: storageCount, cookingFamilyMemberIds: [...params.cookingFamilyMemberIds] }]
        : [],
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
  const batches = pruneBatchesWithoutScheduledMeals(params.plan, params.batches);
  const slot = params.plan.find((candidate) => getPlanSlotKey(candidate) === params.slotKey);
  if (!slot?.recipe?.isBatchRecipe || !slot.batchGroupId) return batches;
  const cookingFamilyMemberIds = slot.cookingFamilyMemberIds?.length
    ? slot.cookingFamilyMemberIds
    : params.fallbackFamilyMemberIds;
  const batch = batches.find(
    (candidate) => candidate.id === slot.batchGroupId && candidate.recipeId === slot.recipe!.id,
  );

  if (!batch) {
    return ensureBatchForPlacement({
      plan: params.plan,
      batches,
      batchGroupId: slot.batchGroupId,
      recipeId: slot.recipe.id,
      requestedMeals: params.requestedMeals,
      cookingFamilyMemberIds,
    });
  }

  const previousScheduledCount = params.previousPlan
    ? getBatchScheduledSlots(params.previousPlan, batch).length
    : getBatchScheduledSlots(params.plan, batch).length;
  const nextScheduledCount = getBatchScheduledSlots(params.plan, batch).length;
  const newlyScheduledCount = Math.max(nextScheduledCount - previousScheduledCount, 0);
  if (newlyScheduledCount === 0) return batches;

  return batches.map((candidate) =>
    candidate.id === batch.id && candidate.recipeId === batch.recipeId
      ? {
          ...candidate,
          storageRows: consumeStorageMeals(
            candidate.storageRows,
            newlyScheduledCount,
            cookingFamilyMemberIds,
          ),
        }
      : candidate,
  );
}
