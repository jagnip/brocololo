import { Skeleton } from "@/components/ui/skeleton";

export default function IngredientsPageSkeleton() {
  return (
    <div className="page-container">
      <header className="w-full">
        <Skeleton className="h-8 w-40" />
      </header>

      <div className="grid w-full grid-cols-2 gap-2 pt-1 pb-4 lg:grid-cols-4">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>

      <ul className="flex flex-col gap-item">
        {Array.from({ length: 5 }, (_, index) => (
          <li
            key={index}
            className="flex flex-col gap-item rounded-md border border-border/60 bg-card p-nest"
          >
            <div className="flex items-start justify-between gap-item md:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-item md:items-center">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 sm:gap-item">
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>

              <ul className="hidden shrink-0 items-center gap-1 md:flex">
                {Array.from({ length: 4 }, (_, badgeIndex) => (
                  <li key={badgeIndex}>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </li>
                ))}
              </ul>

              <Skeleton className="size-8 rounded-md" />
            </div>
          </li>
        ))}
      </ul>

      <Skeleton className="h-5 w-44" />
    </div>
  );
}
