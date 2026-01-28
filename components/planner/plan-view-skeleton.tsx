import { Skeleton } from "@/components/ui/skeleton";

export function PlanViewSkeleton() {
  return (
    <section className="mt-8 space-y-8">
      {/* Used while generating a new plan so stale results are hidden. */}
      <Skeleton className="h-6 w-28" />

      {Array.from({ length: 3 }).map((_, dayIndex) => (
        <article key={dayIndex} className="space-y-4">
          <Skeleton className="h-5 w-36" />
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, slotIndex) => (
              <div key={slotIndex} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-28 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
