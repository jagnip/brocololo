import { notFound } from "next/navigation";
import { getPlanSummaryById, getRecentPlansCached } from "@/lib/db/planner";
import { formatDateRangeLabel } from "@/lib/format-date-range-label";
import { PlanDetailTopbarConfig } from "@/components/planner/plan-detail-topbar-config";
import { mapPlansToSwitcherOptions } from "@/lib/planner/plan-switcher-options";
import { requireUser } from "@/lib/auth/session";

/** Server entry from `app/plan/[planId]/layout.tsx` so the top bar persists across plan switches. */
export async function PlanTopbar({ planId, surface = "plan" }: { planId: string; surface?: "plan" | "log" }) {
  const { id: userId } = await requireUser();
  const [current, recentPlans] = await Promise.all([
    getPlanSummaryById(userId, planId),
    getRecentPlansCached(userId),
  ]);
  if (!current) notFound();

  const planDateRangeLabel = formatDateRangeLabel(
    new Date(current.startDate),
    new Date(current.endDate),
  );

  const planOptions = recentPlans.some((plan) => plan.id === planId)
    ? mapPlansToSwitcherOptions(recentPlans)
    : [];

  return (
    <PlanDetailTopbarConfig
      planId={planId}
      planDateRangeLabel={planDateRangeLabel}
      planOptions={planOptions}
      surface={surface}
    />
  );
}
