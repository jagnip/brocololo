import { Skeleton } from "../ui/skeleton";

export default function GridSkeleton() {
  return (
    <div className="px-4 pb-4 w-full grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl">
          <Skeleton className="w-full aspect-3/2 rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}