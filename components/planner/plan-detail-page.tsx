import { getPlans } from "@/lib/db/planner";
import { PlanEditorContainer } from "@/components/planner/plan-editor-container";
import { PlanPageHeader } from "./plan-page-header";

type PlanDetailPageProps = {
  planId: string;
};

function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  const startStr = start.toLocaleDateString("en-US", options);
  const endStr = end.toLocaleDateString("en-US", options);
  return `${startStr} - ${endStr}`;
}

export async function PlanDetailPage({ planId }: PlanDetailPageProps) {
  const plans = await getPlans();
  // Build stable select labels from persisted plan date ranges.
  const planOptions = plans.map((plan) => ({
    id: plan.id,
    label: formatDateRange(plan.startDate, plan.endDate),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PlanPageHeader planOptions={planOptions} planId={planId} />
      <PlanEditorContainer planId={planId} />
    </div>
  );
}
