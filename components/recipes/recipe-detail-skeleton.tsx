import { Skeleton } from "@/components/ui/skeleton";

export function RecipeDetailSkeleton() {
  return (
    <div className="page-container">
      {/* Mirror recipe page structure so loading layout stays stable across breakpoints. */}
      <div className="grid grid-cols-1 gap-block md:grid-cols-5 md:gap-block">
        {/* Full-width header */}
        <div className="order-1 md:order-0 md:col-span-5">
          <Skeleton className="h-9 w-72" />
        </div>

        <div className="order-2 md:order-0 md:col-span-5 flex gap-item flex-wrap">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-36 rounded-full" />
        </div>

        {/* Photos left, nutrition right — photo skeleton stretches with nutrition. */}
        <div className="order-3 md:order-0 md:col-span-3 md:h-full">
          <div className="aspect-video h-full min-h-72 overflow-hidden rounded-xl md:aspect-auto">
            <Skeleton className="size-full" />
          </div>
        </div>

        <div className="order-5 md:order-0 md:col-span-2 md:h-full space-y-item">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>

        {/* Full-width cooking for */}
        <div className="order-4 md:order-0 md:col-span-5 space-y-item">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>

        {/* Left column: instructions, notes */}
        <div className="contents md:col-span-3 md:block md:space-y-block">
          <div className="order-7 md:order-0 space-y-item">
            <Skeleton className="h-7 w-28" />
            <div className="space-y-item">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>

          <div className="order-8 md:order-0 space-y-item">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>

        {/* Right column: ingredients */}
        <div className="contents md:col-span-2 md:block md:space-y-block">
          <div className="order-6 md:order-0 space-y-item">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
            <Skeleton className="h-12 w-full rounded-lg" />
            <div className="space-y-item">
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
