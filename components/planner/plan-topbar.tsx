import { notFound } from "next/navigation";
import { getPlansCached } from "@/lib/db/planner";
import { PlanTopbarConfig } from "@/components/planner/plan-topbar-config";

/** Server entry from `app/plan/[planId]/layout.tsx` so the top bar persists across plan switches. */
export async function PlanTopbar({ planId }: { planId: string }) {
  const plans = await getPlansCached();
  const current = plans.find((p) => p.id === planId);
  if (!current) notFound();

  return <PlanTopbarConfig />;
}
