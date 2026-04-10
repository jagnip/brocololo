import { Skeleton } from "@/components/ui/skeleton";

export function PlanEditorSkeleton() {
  return (
    <section className="space-y-8" aria-busy="true" aria-label="Loading planner">
      <div className="space-y-4">
        <Skeleton className="h-9 w-44 rounded-md" />
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-2">
          <div className="flex min-w-0 flex-nowrap items-center gap-1.5 md:flex-wrap md:gap-2">
            <Skeleton className="h-9 w-full max-w-[22rem] rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
      </div>

      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <article key={index} className="space-y-4">
            <Skeleton className="h-7 w-44 rounded-md" />
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <Skeleton className="h-72 w-full rounded-lg" />
              <Skeleton className="h-72 w-full rounded-lg" />
              <Skeleton className="h-72 w-full rounded-lg" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
