import { PlanEditorSkeleton } from "@/components/planner/plan-editor-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  // Mirror top page header area before editor skeleton appears.
  return (
    <div className="page-container">
      <div className="pb-2">
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>
      <PlanEditorSkeleton />
    </div>
  );
}
