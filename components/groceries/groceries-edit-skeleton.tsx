import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function GroceriesEditSkeleton() {
  return (
    // Match groceries edit page container: full-width canvas with gutter padding.
    <div className="flex min-w-0 w-full max-w-full flex-col">
      {/* Full-width category navigator placeholder — sticky under app topbar. */}
      <div className="sticky top-0 z-10 mb-gutter w-full min-w-0 max-w-full overflow-x-hidden bg-background">
        <div className="chip-strip-fade relative -mx-gutter px-gutter">
          <div className="scroll-touch scroll-ps-gutter scroll-pe-gutter snap-x snap-mandatory w-full min-w-0 overflow-x-auto overflow-y-hidden hide-scrollbar py-2.5 pb-3">
            <div className="flex w-max flex-nowrap gap-item">
              <div className="w-gutter shrink-0" aria-hidden />
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-24 shrink-0 rounded-md" />
            ))}
              <div className="w-gutter shrink-0" aria-hidden />
            </div>
          </div>
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

      {/* Main edit grid: lists (mobile accordion / desktop sidebar) + grocery sections. */}
      <div
        className={cn(
          "flex w-full min-w-0 flex-col gap-gutter px-gutter lg:grid lg:items-start lg:gap-6",
          "lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]",
        )}
      >
        {/* Below lg: foldable lists accordion above grocery content. */}
        <div className="order-1 rounded-xl border bg-card p-4 lg:order-0 lg:col-start-2 lg:row-start-1 lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="size-8" />
            </div>
            <Skeleton className="size-8" />
          </div>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="size-9" />
              <Skeleton className="size-9" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* lg+: sidebar lists panel with outlined chevron beside title. */}
        <aside className="order-1 hidden lg:order-0 lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="size-8" />
              </div>
              <Skeleton className="size-8" />
            </div>
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="size-9" />
                <Skeleton className="size-9" />
              </div>
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="order-2 flex flex-col gap-8 lg:order-0 lg:col-start-1">
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
                    {/* Mobile row shape matches `GroceriesEditRow` (< md). */}
                    <div className="space-y-2 md:hidden">
                      <div className="grid items-start gap-2 grid-cols-[minmax(0,1fr)_auto_8rem]">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-[calc(7ch+1.5rem)] shrink-0" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="grid items-start gap-2 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-10 justify-self-end" />
                      </div>
                    </div>

                    {/* Tablet row shape (md–xl). */}
                    <div className="hidden space-y-2 md:block xl:hidden">
                      <div className="grid items-start gap-2 md:grid-cols-[minmax(0,1fr)_auto_8rem_auto]">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-[calc(7ch+1.5rem)] shrink-0" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-10 md:justify-self-end" />
                      </div>
                      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>

                    {/* Desktop row shape: single dense horizontal line of fields/actions. */}
                    <div className="hidden xl:grid xl:grid-cols-[minmax(0,1.3fr)_auto_8rem_minmax(0,1fr)_max-content_minmax(0,1fr)_auto] 2xl:grid-cols-[minmax(0,1.5fr)_auto_7.5rem_minmax(0,1.1fr)_minmax(0,1.1fr)_auto] xl:items-start xl:gap-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-[calc(7ch+1.5rem)] shrink-0" />
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
      </div>
    </div>
  );
}
