import { PlanDetailPage } from "@/components/planner/plan-detail-page";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  return (
    <div className="page-container">
      <PlanDetailPage planId={planId} />
    </div>
  );
}
