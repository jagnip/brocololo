import { Skeleton } from "@/components/ui/skeleton";

export function PlanViewSkeleton() {
  return (
    <section className="space-y-8" aria-busy="true" aria-label="Loading plan">
      {Array.from({ length: 3 }).map((_, dayIndex) => (
        <article key={dayIndex} className="space-y-4">
          <Skeleton className="h-5 w-36 rounded-md" />
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, slotIndex) => (
              <div
                key={slotIndex}
                className="overflow-hidden rounded-lg"
              >
                {/* Mirror planner card media ratio for visual stability while loading. */}
                <Skeleton className="aspect-2/1 w-full sm:aspect-3/2 rounded-none" />
                <div className="space-y-3 p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4 rounded-md" />
                    <Skeleton className="h-4 w-1/3 rounded-md" />
                  </div>
                  <div className="flex gap-1">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
