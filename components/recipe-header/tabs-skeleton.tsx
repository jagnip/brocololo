import { Skeleton } from "../ui/skeleton";

export function TabsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      <Skeleton className="h-10 w-16 rounded-lg" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-32 rounded-lg" />
      ))}
    </div>
  );
}
