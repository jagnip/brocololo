import { Skeleton } from "@/components/ui/skeleton";

/**
 * Same vocabulary as `LogPageSkeleton`: plain `Skeleton` bars, spacing, rounded-md / rounded-lg only.
 * Mirrors PlannerForm Lists-style left rail (one outer card + section separators).
 */
export function PlannerFormSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(306px,1fr)_minmax(0,2fr)] lg:items-start lg:gap-x-4 lg:gap-y-6"
      aria-busy="true"
      aria-label="Loading planner"
    >
      <div className="flex h-full w-full min-w-0 flex-col lg:sticky lg:top-4 lg:h-[calc(100dvh-5.5rem)] lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
          {/* Suggest meals title (day-header size) + caret top-right */}
          <div className="flex items-center justify-between gap-2 p-4">
            <Skeleton className="h-7 w-36 rounded-md" />
            <Skeleton className="hidden size-8 rounded-md lg:block" />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="divide-y divide-border px-4">
              <div className="space-y-2 pb-4">
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-3 py-4">
                <Skeleton className="h-9 w-44 max-w-full rounded-md" />
                <Skeleton className="h-28 w-full rounded-lg" />
              </div>
              <div className="space-y-3 py-4">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-28 w-full rounded-lg" />
              </div>
              <div className="space-y-2 py-4">
                <Skeleton className="h-9 w-56 max-w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
            <div className="px-4 py-4 lg:hidden">
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>

          <div className="hidden shrink-0 border-t border-border p-4 lg:block">
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
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
