import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors `LogActiveDayView` structure across breakpoints (pool + log + details). */
export function LogPageSkeleton() {
  return (
    <article className="space-y-6" aria-busy="true" aria-label="Loading log">
      <div className="space-y-4">
        <Skeleton className="h-9 w-44 rounded-md" />
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-2">
          <div className="flex flex-nowrap items-center gap-1.5 md:flex-wrap md:gap-2">
            <Skeleton className="h-9 w-44 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 2xl:grid 2xl:grid-cols-8 2xl:gap-2 2xl:items-stretch">
        <div className="space-y-2 2xl:col-span-2 2xl:min-h-0">
          <Skeleton className="h-7 w-36 rounded-md" />
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-y-2 lg:grid lg:grid-cols-5 lg:content-start lg:gap-x-2 lg:gap-y-2 2xl:col-span-6">
          <Skeleton className="h-7 w-20 rounded-md lg:col-span-5" />

          <div className="lg:col-span-2">
            <div className="grid items-stretch gap-4 sm:grid-cols-2 sm:gap-2 lg:grid-cols-1 lg:gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))}
            </div>
          </div>

          <div className="min-h-0 lg:col-span-3">
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </article>
  );
}
