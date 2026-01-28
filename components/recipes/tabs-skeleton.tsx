import { Skeleton } from "../ui/skeleton";

export function TabsSkeleton() {
  return (
    <div className="flex items-center gap-2" data-slot="recipes-tabs-skeleton">
      {/* Keep tabs skeleton on a single row to match common recipes header height. */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      {/* Reserve room for the inline search control in loading state. */}
      <Skeleton className="h-10 w-56 rounded-lg" data-slot="recipes-search-skeleton" />
    </div>
  );
}
