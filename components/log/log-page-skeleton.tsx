import { Skeleton } from "@/components/ui/skeleton";

/**
 * Minimal loading UI for `/log/[logId]`, matching the lightweight style used
 * by recipes/recipe pages (simple bars + card blocks, no high-fidelity details).
 */
export function LogPageSkeleton() {
  return (
    <section className="space-y-8" aria-busy="true" aria-label="Loading log">
      {/* Header area: one title line + compact controls row. */}
      <div className="space-y-4">
        <Skeleton className="h-9 w-48 max-w-[90vw] rounded-md" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-44 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>

      {/* Main content: simple two-column cards, intentionally low-detail. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    </section>
  );
}
