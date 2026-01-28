import { Skeleton } from "@/components/ui/skeleton";

export function PlanEditorSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Mirrors edit plan heading and save status area. */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>

      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <article key={index} className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
