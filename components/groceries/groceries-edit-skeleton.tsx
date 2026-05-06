import { Skeleton } from "@/components/ui/skeleton";

export function GroceriesEditSkeleton() {
  return (
    // Match groceries edit page container: full-width canvas with gutter padding.
    <div className="w-full space-y-8">
      {/* Sticky category navigator placeholder (hidden on xs like real UI). */}
      <div className="hidden w-full py-2 sm:block">
        <div className="flex w-full flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-6 w-24 rounded-full" />
          ))}
        </div>
      </div>

      {/* Layout controls row: selector + action buttons. */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-[220px]" />
          </div>
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10" />
        </div>
      </section>

      {/* Main edit grid: grocery sections on left + library panel on right. */}
      <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          {Array.from({ length: 3 }).map((_, sectionIndex) => (
            <section key={sectionIndex} className="space-y-3">
              <Skeleton className="h-6 w-36" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((__, rowIndex) => (
                  <Skeleton
                    // Keep card-like row placeholders similar to groceries edit rows.
                    key={rowIndex}
                    className="h-28 w-full rounded-lg"
                  />
                ))}
              </div>
              <Skeleton className="h-10 w-24" />
            </section>
          ))}
        </div>

        {/* Right-side ingredient library skeleton mirrors new edit sidebar panel. */}
        <aside className="hidden rounded-xl border bg-card p-4 lg:block">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-8 w-8" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
            </div>
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
