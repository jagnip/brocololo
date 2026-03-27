import { Skeleton } from "@/components/ui/skeleton";

export function RecipeDetailSkeleton() {
  return (
    <div className="page-container">
      {/* Mirror recipe page structure so loading layout stays stable across breakpoints. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5 md:gap-6">
        <div className="order-1 md:order-0 md:col-span-5">
          <Skeleton className="h-9 w-72" />
        </div>

        <div className="contents md:col-span-3 md:block md:space-y-6">
          <div className="order-2 md:order-0 overflow-hidden rounded-xl">
            <Skeleton className="h-64 w-full md:h-80 lg:h-96" />
          </div>

          <div className="order-5 md:order-0 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-6 w-28" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-8 w-18 rounded-md" />
                <Skeleton className="h-8 w-18 rounded-md" />
              </div>
            </div>
            <div className="space-y-2.5">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>

          <div className="order-6 md:order-0 space-y-2.5">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>

        <div className="contents md:col-span-2 md:block md:space-y-6">
          <div className="order-3 md:order-0 space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-36 rounded-full" />
            </div>

            <div className="space-y-2.5">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </div>

          <div className="order-4 md:order-0 space-y-2.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-12 w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
