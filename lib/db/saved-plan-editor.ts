import { prisma } from "@/lib/db";
import { getPlanBatchesById, getPlanById } from "@/lib/db/planner";
import { pruneBatchesWithoutScheduledMeals } from "@/lib/planner/batch-storage";

export async function getSavedPlanEditorData(userId: string, planId: string) {
  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId },
    select: { version: true },
  });
  if (!plan) return null;
  const [slots, batches] = await Promise.all([
    getPlanById(userId, planId),
    getPlanBatchesById(userId, planId),
  ]);
  if (!slots || !batches) return null;
  // Historical storage-only batches are preserved in the DB, not resubmitted as editable batches.
  return { slots, batches: pruneBatchesWithoutScheduledMeals(slots, batches), version: plan.version };
}
