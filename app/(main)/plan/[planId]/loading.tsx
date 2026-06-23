import { LogPageSkeleton } from "@/components/log/log-page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  // Mirror the shared Meal plan shell row: tabs only (+ optional Track controls).
  return (
    <div className="page-container">
      <div className="space-y-4 pb-2">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-40 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>
      </div>
      <LogPageSkeleton />
    </div>
  );
}
