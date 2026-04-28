import { Skeleton } from "@/components/ui/skeleton";

export function IngredientsPageSkeleton() {
  return (
    <div className="page-container">
      {/* Keep loading layout aligned with the ingredients header and search. */}
      <header className="w-full">
        <Skeleton className="h-8 w-40" />
      </header>

      <Skeleton className="h-9 w-full" />

      {/* Match the card/list feel of the ingredients results section. */}
      <div className="rounded-lg border">
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="p-4 space-y-3">
              <div className="flex w-full items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-56" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <div className="shrink-0 space-y-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
      </div>

      <Skeleton className="h-5 w-44" />
    </div>
  );
}
