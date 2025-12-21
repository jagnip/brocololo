import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <header className="flex flex-wrap gap-2 sticky top-0 z-10 bg-background py-4 px-4 w-full">
        <Skeleton className="h-10 w-16 rounded-lg bg-muted" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-32 rounded-lg bg-muted" />
        ))}
      </header>

      <div className="px-4 pb-4 w-full grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton
            key={i}
            className="w-full aspect-square rounded-xl bg-muted"
          />
        ))}
      </div>
    </>
  );
}
