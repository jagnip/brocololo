import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { getPlans } from "@/lib/db/planner";
import { resolveCurrentPlanFromList, resolveTrackDayKey } from "@/lib/planner/resolve-current-plan";
import { PlanCurrentEmpty } from "@/components/planner/plan-current-empty";
import { requireUser } from "@/lib/auth/session";

export default async function LogCurrentPage({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string; day?: string }>;
}) {
  const { id: userId } = await requireUser();
  const plans = await getPlans(userId);
  const { memberId, day } = await searchParams;
  const plan = resolveCurrentPlanFromList(plans);
  if (!plan) {
    return <PlanCurrentEmpty emptyBreadcrumbContext="log" />;
  }

  const params = new URLSearchParams();
  params.set("day", day ?? resolveTrackDayKey(plan));
  if (memberId) {
    params.set("memberId", memberId);
  }
  redirect(`${ROUTES.logPlanView(plan.id)}?${params.toString()}`);
}
