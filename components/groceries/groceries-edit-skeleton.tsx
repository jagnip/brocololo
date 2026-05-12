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
                  <div
                    // Mirror real groceries rows: rounded card with field-like skeletons.
                    key={rowIndex}
                    className="space-y-2 rounded-lg p-3"
                  >
                    {/* Mobile/tablet row shape (stacked controls) matches `GroceriesEditRow`. */}
                    <div className="space-y-2 xl:hidden">
                      <div className="grid items-start gap-2 md:grid-cols-[minmax(0,1fr)_7rem_10rem_auto]">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-10 md:justify-self-end" />
                      </div>
                      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <Skeleton className="h-10 w-full" />
                        <div className="grid grid-cols-1 gap-y-2 md:grid-cols-[max-content_minmax(0,1fr)] md:gap-x-2">
                          <Skeleton className="h-10 w-36" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      </div>
                    </div>

                    {/* Desktop row shape: single dense horizontal line of fields/actions. */}
                    <div className="hidden xl:grid xl:grid-cols-[minmax(0,1.3fr)_7rem_10rem_minmax(0,1fr)_max-content_minmax(0,1fr)_auto] xl:items-start xl:gap-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-32" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-10 justify-self-end" />
                    </div>

                    {/* Badge strip placeholder for recipe attribution chips under a row. */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                ))}
              </div>
              <Skeleton className="h-10 w-24" />
            </section>
          ))}
        </div>

        {/* Right-side ingredient library skeleton mirrors new edit sidebar panel. */}
        <aside className="hidden rounded-xl bg-card p-4 lg:block">
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
