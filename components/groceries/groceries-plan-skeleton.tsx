import { Skeleton } from "@/components/ui/skeleton";

/** Loading state for persisted groceries plan view (header + category sections). */
export function GroceriesPlanSkeleton() {
  return (
    <div className="space-y-8">
      {/* Persisted list header currently renders a single H1 line only. */}
      <header className="space-y-1">
        <Skeleton className="h-9 w-80 max-w-full" />
      </header>

      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <section key={index} className="space-y-3">
            <Skeleton className="h-5 w-40" />
            {/* The real view uses a plain <ul className="divide-y"> list. */}
            <ul className="divide-y">
              <li className="py-3">
                <Skeleton className="h-9 w-full" />
              </li>
              <li className="py-3">
                <Skeleton className="h-9 w-full" />
              </li>
              <li className="py-3">
                <Skeleton className="h-9 w-full" />
              </li>
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
