import { Skeleton } from "@/components/ui/skeleton";

export function GroceriesIndexSkeleton() {
  return (
    <div className="page-container space-y-8 py-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <div className="divide-y rounded-xl bg-card">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-3 px-4 py-4"
          >
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-9 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
