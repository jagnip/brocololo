import { Skeleton } from "@/components/ui/skeleton";

export function GroceriesPlanSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Align with groceries plan view (title + date chips + grouped list). */}
      <Skeleton className="h-8 w-36" />

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-24 rounded-md" />
        ))}
      </div>

      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <section key={index} className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
