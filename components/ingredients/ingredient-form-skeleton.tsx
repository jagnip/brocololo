import { Skeleton } from "@/components/ui/skeleton";

export function IngredientFormSkeleton() {
  return (
    <div className="max-w-3xl mx-auto mt-10 space-y-5">
      {/* Mirrors ingredient create/edit form spacing and rhythm. */}
      <Skeleton className="h-8 w-48" />

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>

      <Skeleton className="h-10 w-36" />
    </div>
  );
}
