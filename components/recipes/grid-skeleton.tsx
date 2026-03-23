import { Skeleton } from "../ui/skeleton";

export default function GridSkeleton() {
  return (
    <div className="px-4 pb-4 w-full grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          // Keep height aligned with real cards (which have 1px borders) without visible border color.
          className="h-full overflow-hidden rounded-xl border border-transparent bg-card text-card-foreground shadow-xs"
        >
          {/* Match live card image ratio across breakpoints. */}
          <Skeleton className="w-full aspect-2/1 sm:aspect-3/2 rounded-none" />
          <div className="space-y-2 px-4 py-3">
            <Skeleton className="h-5 w-2/3 rounded-md" />
            <div className="flex items-center gap-1 overflow-hidden whitespace-nowrap">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}