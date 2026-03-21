import { Skeleton } from "../ui/skeleton";

export function TabsSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-2 pb-4 md:grid-cols-3 lg:grid-cols-6 pt-4"
      data-slot="recipes-tabs-skeleton"
    >
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton
        className="col-span-2 h-9 w-full rounded-md md:col-span-2 lg:col-span-2"
        data-slot="recipes-search-skeleton"
      />
    </div>
  );
}
