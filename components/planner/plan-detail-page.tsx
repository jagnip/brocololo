import { PlanEditorContainer } from "@/components/planner/plan-editor-container";

type PlanDetailPageProps = {
  planId: string;
};

export async function PlanDetailPage({ planId }: PlanDetailPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <PlanEditorContainer planId={planId} />
    </div>
  );
}
