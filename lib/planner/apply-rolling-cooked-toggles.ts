import type { RollingMealType } from "@/lib/validations/planner";
import type { PlanBatchInput, PlanInputType, RollingQueueClaim } from "@/types/planner";

export type RollingCookedDraftBackup = {
  placements: Map<string, { recipeId: string; batchGroupId: string | null; claim: RollingQueueClaim }>;
  batches: Map<string, PlanBatchInput>;
};

export function applyRollingCookedToggles(
  plan: PlanInputType,
  batches: PlanBatchInput[],
  previousEntries: RollingMealType[],
  nextEntries: RollingMealType[],
  backup: RollingCookedDraftBackup = { placements: new Map(), batches: new Map() },
): { plan: PlanInputType; batches: PlanBatchInput[]; backup: RollingCookedDraftBackup } {
  const toggles = new Map<string, boolean>();
  for (const next of nextEntries) {
    if (next.kind === "custom") continue;
    const previous = previousEntries.find(
      (entry) => entry.kind !== "custom" && entry.recipeId === next.recipeId,
    );
    if (previous && previous.kind !== "custom" &&
      Boolean(previous.alreadyCooked) !== Boolean(next.alreadyCooked)) {
      toggles.set(next.recipeId, Boolean(next.alreadyCooked));
    }
  }
  if (toggles.size === 0) return { plan, batches, backup };

  const placements = new Map([...backup.placements].filter(([placementId, source]) =>
    plan.some((slot) => slot.placementId === placementId && slot.recipe?.id === source.recipeId &&
      (slot.batchGroupId ?? null) === source.batchGroupId)));
  const batchBackups = new Map(backup.batches);
  const cookedBatchIds = new Set<string>();
  const restoredBatchIds = new Set<string>();
  const nextPlan = plan.map((slot) => {
    if (!slot.isRolledOver || !slot.recipe?.isBatchRecipe) return slot;
    const alreadyCooked = toggles.get(slot.recipe.id);
    if (alreadyCooked === undefined) return slot;
    if (alreadyCooked) {
      if (slot.placementId && !slot.alreadyCooked && slot.rollingQueueClaim) {
        placements.set(slot.placementId, {
          recipeId: slot.recipe.id,
          batchGroupId: slot.batchGroupId ?? null,
          claim: slot.rollingQueueClaim,
        });
        const batch = batches.find((batch) => batch.id === slot.batchGroupId && batch.recipeId === slot.recipe!.id);
        if (batch) batchBackups.set(batch.id, batch);
      }
      if (slot.batchGroupId) cookedBatchIds.add(slot.batchGroupId);
    }
    const source = slot.placementId ? placements.get(slot.placementId) : undefined;
    const claim = source?.claim ?? (!slot.alreadyCooked ? slot.rollingQueueClaim : null);
    if (!alreadyCooked && source?.batchGroupId) restoredBatchIds.add(source.batchGroupId);
    if (!alreadyCooked && slot.placementId) placements.delete(slot.placementId);
    return {
      ...slot,
      alreadyCooked,
      isRolledOver: alreadyCooked || Boolean(claim),
      rollingQueueClaim: alreadyCooked ? null : claim,
    };
  });
  // Planned leftovers are not cooked inventory. Dropping them prevents a fresh
  // remainder from being created when this cooked batch is saved.
  const nextBatches = batches.map((batch) => {
    if (cookedBatchIds.has(batch.id)) return { ...batch, rollingQueueClaim: null, storageRows: [] };
    const original = batchBackups.get(batch.id);
    if (restoredBatchIds.has(batch.id) && original?.recipeId === batch.recipeId) {
      batchBackups.delete(batch.id);
      return original;
    }
    return batch;
  });
  return { plan: nextPlan, batches: nextBatches, backup: { placements, batches: batchBackups } };
}
