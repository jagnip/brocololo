import { prisma } from "@/lib/db";
import { getPlanBatchesById, getPlanById } from "@/lib/db/planner";

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
  return { slots, batches, version: plan.version };
}
