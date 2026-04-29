import { PlanEditorSkeleton } from "@/components/planner/plan-editor-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  // Mirror the shared Meal plan shell row: tabs + date range.
  return (
    <div className="page-container">
      <div className="space-y-4 pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
          <div className="flex items-center gap-2 sm:min-w-[20rem] lg:min-w-[24rem]">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>
      </div>
      <PlanEditorSkeleton />
    </div>
  );
}
