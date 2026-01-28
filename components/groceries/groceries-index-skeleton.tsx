import { Skeleton } from "@/components/ui/skeleton";

export function GroceriesIndexSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Keep heading shape consistent with groceries index page. */}
      <header className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-8 w-36" />
      </header>

      <div className="rounded-lg border divide-y">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="p-4 flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
