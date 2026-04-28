import { Skeleton } from "@/components/ui/skeleton";

export function IngredientsPageSkeleton() {
  return (
    <div className="page-container">
      {/* Keep loading layout aligned with the ingredients header and search. */}
      <header className="w-full">
        <Skeleton className="h-8 w-40" />
      </header>

      {/* Mirror the new filter bar: search input + category select on `sm+`. */}
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[1fr_minmax(12rem,18rem)]">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>

      {/* Mirror the new card-based ingredient rows: bordered card with icon + identity, nutrition badges, edit button, and an optional conversions row. */}
      <ul className="flex flex-col gap-item">
        {Array.from({ length: 5 }).map((_, index) => (
          <li
            key={index}
            className="flex flex-col gap-item rounded-md border border-border/60 p-nest"
          >
            {/* Top row: identity + nutrition badges (md+) + edit icon button. */}
            <div className="flex items-start justify-between gap-item">
              <div className="flex min-w-0 flex-1 items-center gap-item">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex min-w-0 flex-wrap items-center gap-item">
                  <Skeleton className="h-5 w-44" />
                  {/* Outline category badge placeholder. */}
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>

              {/* Four nutrition badge placeholders sit on the right at md+. */}
              <ul className="hidden shrink-0 items-center gap-1 md:flex">
                <li>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </li>
                <li>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </li>
                <li>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </li>
                <li>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </li>
              </ul>

              {/* Edit button placeholder (icon-sm = size-8). */}
              <Skeleton className="size-8 rounded-md" />
            </div>

            {/* No conversions row for now; kept intentionally empty to mirror real row. */}
          </li>
        ))}
      </ul>

      <Skeleton className="h-5 w-44" />
    </div>
  );
}
