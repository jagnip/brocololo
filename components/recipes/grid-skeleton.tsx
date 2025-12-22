import { Skeleton } from "../ui/skeleton";

export default function GridSkeleton() {
  return (
    <div className="px-4 pb-4 w-full grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="w-full aspect-square rounded-xl bg-muted" />
      ))}
    </div>
  );
}