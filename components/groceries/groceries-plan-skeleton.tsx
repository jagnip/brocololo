import { Skeleton } from "@/components/ui/skeleton";

/** Loading state for persisted groceries plan view (header + category sections). */
export function GroceriesPlanSkeleton() {
  return (
    <div className="space-y-6">
      {/* Persisted list header: title left + layout control right (planner-like). */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Skeleton className="h-9 w-80 max-w-full" />
        <div className="flex items-center gap-2 sm:min-w-[20rem] lg:min-w-[24rem]">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-10 w-full" />
        </div>
      </header>

      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <section key={index} className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <ul className="flex flex-col gap-tight">
              {Array.from({ length: 3 }).map((_, rowIndex) => (
                <li
                  key={rowIndex}
                  className="rounded-md border border-border/60 bg-card p-nest"
                >
                  <Skeleton className="h-9 w-full" />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
