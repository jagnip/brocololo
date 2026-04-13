import { Skeleton } from "@/components/ui/skeleton";

export function PlanViewSkeleton() {
  return (
    <section className="space-y-8" aria-busy="true" aria-label="Loading plan">
      {/* Match log skeletons: rounded-md titles, rounded-lg blocks, no extra chrome. */}
      <Skeleton className="h-6 w-28 rounded-md" />

      {Array.from({ length: 3 }).map((_, dayIndex) => (
        <article key={dayIndex} className="space-y-4">
          <Skeleton className="h-5 w-36 rounded-md" />
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, slotIndex) => (
              <div key={slotIndex} className="space-y-2">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-28 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
