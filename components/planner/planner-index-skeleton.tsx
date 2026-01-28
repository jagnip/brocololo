import { Skeleton } from "@/components/ui/skeleton";

export function PlannerIndexSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Mirror planner index title and primary action. */}
      <header className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-28" />
      </header>

      <div className="rounded-lg border divide-y">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="p-4 flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
