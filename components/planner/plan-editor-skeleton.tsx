import { Skeleton } from "@/components/ui/skeleton";

export function PlanEditorSkeleton() {
  return (
    <section className="space-y-8" aria-busy="true" aria-label="Loading planner">
      {/* Header controls are rendered by the shared Meal plan shell loading state. */}
      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <article key={index} className="space-y-4">
            <Skeleton className="h-7 w-44 rounded-md" />
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <Skeleton className="h-72 w-full rounded-lg" />
              <Skeleton className="h-72 w-full rounded-lg" />
              <Skeleton className="h-72 w-full rounded-lg" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
