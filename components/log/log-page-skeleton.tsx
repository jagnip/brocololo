import { Skeleton } from "@/components/ui/skeleton";

/** Horizontal meal card placeholder — mirrors `LogRecipeCard` (image strip + body). */
function LogRecipeCardRowSkeleton() {
  return (
    <div className="flex flex-row overflow-hidden rounded-lg border border-border/60 bg-card">
      <Skeleton className="w-1/4 min-h-20 shrink-0 self-stretch rounded-none" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-3">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-4 w-full max-w-56" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Right column ingredient editor placeholder — mirrors `LogIngredientsForm` sections. */
function LogDetailsPanelSkeleton() {
  return (
    <div className="rounded-lg border">
      <div className="border-b p-4 md:p-6">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="border-b p-4 md:p-6">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-14 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Skeleton className="h-9 w-full sm:w-32" />
          <Skeleton className="h-9 w-full sm:min-w-32 sm:flex-1" />
        </div>
      </div>
    </div>
  );
}

/** Draggable pool card placeholder — short row similar to `LogPlannerPoolCard`. */
function LogPoolCardSkeleton() {
  return (
    <div className="flex flex-row overflow-hidden rounded-lg border bg-card">
      <Skeleton className="w-1/4 min-h-18 shrink-0 self-stretch rounded-none" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/**
 * Full-page placeholder for `/log/[logId]` while the RSC payload resolves.
 * Layout matches `LogDayHeader` + `LogActiveDayView` (pool + log grid + details).
 * The app top bar shows skeleton actions via `AppTopbar` when no `LogTopbarConfig` is mounted yet.
 */
export function LogPageSkeleton() {
  return (
    <section className="space-y-8" aria-busy="true" aria-label="Loading log">
      <article className="space-y-6">
        {/* `LogDayHeader`: title + toolbar + macro badges */}
        <div>
          <div className="flex items-center pb-4">
            <Skeleton className="h-9 w-48 max-w-[90vw]" />
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-2">
            <div className="flex flex-nowrap items-center gap-1.5 md:flex-wrap md:gap-2">
              <div className="min-w-0 flex-1 md:flex-none md:w-48">
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full min-w-32 max-w-40 md:w-36" />
              <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
              <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-12 rounded-full" />
              <Skeleton className="h-6 w-18 rounded-full" />
            </div>
          </div>
        </div>

        {/* `LogActiveDayView`: pool (2xl sidebar) + log column + details */}
        <div className="flex flex-col gap-6 2xl:grid 2xl:grid-cols-8 2xl:gap-2 2xl:items-stretch">
          <div className="2xl:col-span-2 2xl:min-h-0">
            <section className="space-y-2">
              <Skeleton className="h-7 w-36" />
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <LogPoolCardSkeleton key={i} />
                ))}
              </div>
            </section>
          </div>

          <div className="flex min-h-0 flex-col gap-y-2 lg:grid lg:grid-cols-5 lg:content-start lg:gap-x-2 lg:gap-y-2 2xl:col-span-6">
            <div className="lg:col-span-5">
              <Skeleton className="h-7 w-12" />
            </div>

            <div className="lg:col-span-2">
              <div className="grid items-stretch gap-4 sm:grid-cols-2 sm:gap-2 lg:grid-cols-1 lg:gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <LogRecipeCardRowSkeleton key={i} />
                ))}
              </div>
            </div>

            <div className="min-h-0 lg:col-span-3">
              <LogDetailsPanelSkeleton />
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
