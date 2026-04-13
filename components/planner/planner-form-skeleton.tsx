import { Skeleton } from "@/components/ui/skeleton";

/**
 * Same vocabulary as `LogPageSkeleton`: plain `Skeleton` bars, spacing, rounded-md / rounded-lg only
 * (no borders, cards, or dashed shells).
 */
export function PlannerFormSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 lg:grid lg:grid-cols-5 lg:items-start lg:gap-x-4 lg:gap-y-6"
      aria-busy="true"
      aria-label="Loading planner"
    >
      <div className="flex w-full min-w-0 flex-col gap-6 lg:col-span-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-9 w-44 max-w-full rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
          <Skeleton className="h-7 w-28 rounded-md" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-7 w-24 rounded-md" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-9 w-64 max-w-full rounded-md" />
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-40 rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>

      <div className="hidden min-h-0 lg:col-span-3 lg:block">
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    </div>
  );
}
