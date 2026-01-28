import { Skeleton } from "@/components/ui/skeleton";

export function RecipeFormSkeleton() {
  return (
    <div className="max-w-3xl mx-auto mt-10 space-y-5">
      {/* Matches recipe form title and stacked fields. */}
      <Skeleton className="h-8 w-44" />

      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-32 w-full" />
      </div>

      <Skeleton className="h-10 w-32" />
    </div>
  );
}
