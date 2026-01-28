import { Skeleton } from "@/components/ui/skeleton";

export function RecipeDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Keep detail page loading close to recipe detail composition. */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <Skeleton className="h-4 w-56" />

      <div className="flex flex-col md:flex-row gap-6">
        <Skeleton className="h-72 md:w-1/2 w-full rounded-xl" />
        <div className="flex-1 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Skeleton className="h-6 w-36 rounded-full" />
            <Skeleton className="h-6 w-36 rounded-full" />
          </div>
          <Skeleton className="h-5 w-44" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
          </div>
          <Skeleton className="h-5 w-36" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-10/12" />
          </div>
        </div>
      </div>
    </div>
  );
}
