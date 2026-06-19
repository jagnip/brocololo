import { LogPageSkeleton } from "@/components/log/log-page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  // Mirror the shared Meal plan shell row: tabs + date range.
  return (
    <div className="page-container">
      <div className="space-y-4 pb-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 basis-full sm:basis-auto sm:min-w-48 sm:max-w-md">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
      </div>
      {/* Shared route fallback should match Track UX to avoid flashing plan skeletons on refresh. */}
      <LogPageSkeleton />
    </div>
  );
}
