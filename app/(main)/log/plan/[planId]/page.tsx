import { PlannerLogCombinedPage } from "@/components/planner/planner-log-combined-page";

export default async function LogPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ memberId?: string; day?: string }>;
}) {
  const { planId } = await params;
  const { memberId, day } = await searchParams;

  return (
    <div className="page-container">
      <PlannerLogCombinedPage planId={planId} tab="log" memberId={memberId} day={day} />
    </div>
  );
}
