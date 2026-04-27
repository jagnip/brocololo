import { Skeleton } from "@/components/ui/skeleton";

export function IngredientFormSkeleton() {
  return (
    <div className="page-container space-y-5">
      {/* Match PageHeader height with pb-0 used by ingredient form. */}
      <div>
        <Skeleton className="h-9 w-52" />
      </div>

      {/* Match first form row exactly: name/description/brand/category in page layout. */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>

      {/* Match second form row exactly: icon + supermarket URL. */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-2 lg:grid-cols-4">
        <div className="space-y-2 md:col-span-1 lg:col-span-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2 md:col-span-2 lg:col-span-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Match nutrition grid placement without extra section wrappers. */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-5 md:grid-cols-4 md:gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>

      {/* Unit conversion section keeps heading + controls where the form renders them. */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-36" />
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="grid grid-cols-2 items-end gap-2 md:grid-cols-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full md:col-span-2" />
          </div>
        ))}
        <Skeleton className="h-10 w-36" />
        <div className="w-full md:w-1/4">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
