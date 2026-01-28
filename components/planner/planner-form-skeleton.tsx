import { Skeleton } from "@/components/ui/skeleton";

export function PlannerFormSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* This tracks planner create form layout including repeated day rows. */}
      <Skeleton className="h-10 w-full max-w-md" />

      <div className="max-w-md space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>

      <Skeleton className="h-9 w-60 max-w-md" />
      <Skeleton className="h-9 w-60 max-w-md" />
      <Skeleton className="h-10 w-28" />
    </div>
  );
}
