import { PlanEditorSkeleton } from "@/components/planner/plan-editor-skeleton";

export default function Loading() {
  // Dedicated skeleton for editable saved-plan route.
  return (
    <div className="page-container">
      <PlanEditorSkeleton />
    </div>
  );
}
