import { Skeleton } from "@/components/ui/skeleton";

/**
 * Same vocabulary as `LogPageSkeleton`: plain `Skeleton` bars, spacing, rounded-md / rounded-lg only.
 * Mirrors PlannerForm: Lists-style left rail + “Meal plan for” title on the right.
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
          {/* Suggest meals title + fold caret (mobile up/down, desktop left/right) */}
          <div className="flex items-center justify-between gap-2 p-4">
            <Skeleton className="h-7 w-36 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto hide-scrollbar pe-[var(--scrollbar-size)]">
            <div className="divide-y divide-border pl-4 pr-[calc(1rem-var(--scrollbar-size))]">
              {/* Criteria only — date picker lives on the plan column. First section: no top pad. */}
              <div className="space-y-3 pb-4">
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
            <div className="py-4 pl-4 pr-[calc(1rem-var(--scrollbar-size))] lg:hidden">
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>

          <div className="hidden shrink-0 border-t border-border p-4 lg:block">
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 space-y-6 lg:block">
        {/* Meal plan for + date picker */}
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Skeleton className="h-7 w-32 rounded-md" />
          <Skeleton className="h-10 w-full max-w-sm rounded-md" />
        </div>
        {/* Day rows: space-y-5 between days, space-y-2 day→cards (matches create PlanView). */}
        <div className="space-y-5">
          {Array.from({ length: 2 }).map((_, dayIndex) => (
            <article key={dayIndex} className="space-y-2">
              {/* Day subtext (smaller than column title) */}
              <Skeleton className="h-4 w-36 rounded-md" />
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, slotIndex) => (
                  <Skeleton key={slotIndex} className="h-28 w-full rounded-lg" />
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
