import { PlannerLogCombinedPage } from "@/components/planner/planner-log-combined-page";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ tab?: string; memberId?: string; day?: string }>;
}) {
  const { planId } = await params;
  const { tab, memberId, day } = await searchParams;

  if (tab === "log") {
    const query = new URLSearchParams();
    if (memberId) query.set("memberId", memberId);
    if (day) query.set("day", day);
    redirect(`${ROUTES.logPlanView(planId)}${query.size ? `?${query}` : ""}`);
  }

  return (
    <div className="page-container">
      <PlannerLogCombinedPage
        planId={planId}
        tab="plan"
        memberId={memberId}
        day={day}
      />
    </div>
  );
}
