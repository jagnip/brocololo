import type { PlanBatchInput, PlanInputType, SlotInputType } from "@/types/planner";
import { getPlanSlotKey } from "@/lib/planner/helpers";

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

/** Keep metadata for scheduled grouping, without storing unplaced meals. */
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
  return [
    ...params.batches.filter((batch) => batch.id !== params.batchGroupId),
    { id: params.batchGroupId, recipeId: params.recipeId, storageRows: [], extraPortions: 0 },
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
  return ensureBatchForPlacement({
    plan: params.plan,
    batches,
    batchGroupId: slot.batchGroupId,
    recipeId: slot.recipe.id,
    requestedMeals: params.requestedMeals,
    cookingFamilyMemberIds: slot.cookingFamilyMemberIds ?? params.fallbackFamilyMemberIds,
  });
}
