import { notFound } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getPlanDateRangeById } from "@/lib/db/planner";
import { PlanEditorContainer } from "@/components/planner/plan-editor-container";

function formatPlanPeriod(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export default async function PlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const planDateRange = await getPlanDateRangeById(planId);
  if (!planDateRange) {
    notFound();
  }
  const periodLabel = formatPlanPeriod(planDateRange.startDate, planDateRange.endDate);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Breadcrumbs
        items={[
          { label: "Planner", href: ROUTES.plan },
          { label: periodLabel },
        ]}
      />
      {/* Keep page thin; container handles fetching and notFound logic */}
      <PlanEditorContainer planId={planId} />
    </div>
  );
}
