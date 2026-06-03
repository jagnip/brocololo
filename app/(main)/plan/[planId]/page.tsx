import { PlannerLogCombinedPage } from "@/components/planner/planner-log-combined-page";

export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ tab?: string; memberId?: string }>;
}) {
  const { planId } = await params;
  const { tab, memberId } = await searchParams;

  return (
    <div className="page-container">
      <PlannerLogCombinedPage planId={planId} tab={tab} memberId={memberId} />
    </div>
  );
}
