import { Skeleton } from "@/components/ui/skeleton";

/** Loading state for persisted groceries plan view (title + category sections). */
export function GroceriesPlanSkeleton() {
  return (
    <div className="page-container space-y-8 py-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <section key={index} className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <div className="space-y-0 rounded-xl border bg-card px-4 py-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
