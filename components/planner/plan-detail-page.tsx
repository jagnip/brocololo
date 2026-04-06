import { PlanEditorContainer } from "@/components/planner/plan-editor-container";

type PlanDetailPageProps = {
  planId: string;
};

/** Plan switcher + New plan live in the app top bar (`PlanTopbar` in layout). */
export async function PlanDetailPage({ planId }: PlanDetailPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <PlanEditorContainer planId={planId} />
    </div>
  );
}
