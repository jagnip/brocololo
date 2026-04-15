import { PlannerFormSkeleton } from "@/components/planner/planner-form-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  // Mirror page chrome (header + breadcrumbs) before form skeleton.
  return (
    <div className="page-container">
      <div className="pb-2">
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>
      <div className="flex items-center gap-2 pb-4">
        <Skeleton className="h-4 w-16 rounded-md" />
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-4 w-20 rounded-md" />
      </div>
      <PlannerFormSkeleton />
    </div>
  );
}
