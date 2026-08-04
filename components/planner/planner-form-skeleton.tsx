import { Skeleton } from "@/components/ui/skeleton";

/**
 * Same vocabulary as `LogPageSkeleton`: plain `Skeleton` bars, spacing, rounded-md / rounded-lg only
 * (no borders, cards, or dashed shells).
 * Mirrors PlannerForm: sticky full-height left rail + page-scrolling plan column.
 */
export function PlannerFormSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(306px,1fr)_minmax(0,2fr)] lg:items-start lg:gap-x-4 lg:gap-y-6"
      aria-busy="true"
      aria-label="Loading planner"
    >
      <div className="flex w-full min-w-0 flex-col lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:max-h-[calc(100vh-5rem)]">
        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:overflow-y-auto">
          {/* Desktop-only section header mirrors planner collapse row. */}
          <div className="hidden items-center justify-between lg:flex">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-9 w-44 max-w-full rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-9 w-56 max-w-full rounded-md" />
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Mobile Fill empty placeholder */}
          <Skeleton className="mt-2 h-9 w-full rounded-md lg:hidden" />
        </div>

        {/* Desktop Fill empty footer placeholder */}
        <div className="mt-3 hidden shrink-0 border-t border-border pt-3 lg:block">
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>

      <div className="hidden min-w-0 space-y-8 lg:block">
        <Skeleton className="h-6 w-28 rounded-md" />
        {Array.from({ length: 2 }).map((_, dayIndex) => (
          <article key={dayIndex} className="space-y-4">
            <Skeleton className="h-5 w-36 rounded-md" />
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, slotIndex) => (
                <Skeleton key={slotIndex} className="h-28 w-full rounded-lg" />
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
