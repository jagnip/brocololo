import { PlanEditorContainer } from "@/components/planner/plan-editor-container";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Keep page thin; container handles fetching and notFound logic */}
      <PlanEditorContainer planId={planId} />
    </div>
  );
}
