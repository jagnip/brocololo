import { TopbarConfigController } from "@/components/topbar-config";
import { ROUTES } from "@/lib/constants";
import { PlanDetailPage } from "@/components/planner/plan-detail-page";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  return (
    <div className="page-container">
      <TopbarConfigController
        config={{
          actions: [
            {
              id: "new-plan",
              label: "New plan",
              href: ROUTES.planCreate,
              variant: "default" as const,
              size: "default" as const,
            },
          ],
        }}
      />
      <PlanDetailPage planId={planId} />
    </div>
  );
}
