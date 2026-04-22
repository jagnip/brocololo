import { Skeleton } from "@/components/ui/skeleton";

export function RecipeFormSkeleton() {
  return (
    <div className="page-container space-y-block">
      {/* Mirror create/update header spacing so layout does not jump on load. */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Basics section: name, timing and media placeholders across breakpoints. */}
      <section className="space-y-3">
        <Skeleton className="h-6 w-20" />
        <div className="section-container">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-item lg:grid-cols-3">
              <Skeleton className="h-10 w-full lg:col-span-2" />
              <div className="hidden lg:block" aria-hidden />
            </div>
            <div className="grid grid-cols-1 gap-item md:grid-cols-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <div className="hidden md:block" aria-hidden />
            </div>
            <Skeleton className="h-40 w-full rounded-lg md:h-56" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-sm" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </div>
      </section>

      {/* Categories section: three select controls and helper action row. */}
      <section className="space-y-3">
        <Skeleton className="h-6 w-24" />
        <div className="section-container space-y-3">
          <div className="grid grid-cols-1 gap-item md:grid-cols-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-9 w-44" />
        </div>
      </section>

      {/* Portions section: number input and segmented multipliers. */}
      <section className="space-y-3">
        <Skeleton className="h-6 w-20" />
        <div className="section-container space-y-3">
          <div className="grid grid-cols-1 gap-item md:grid-cols-3">
            <Skeleton className="h-10 w-full" />
            <div className="hidden md:block" aria-hidden />
            <div className="hidden md:block" aria-hidden />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-12 rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ingredient editor area with repeated row placeholders. */}
      <section>
        <div className="section-container space-y-item">
          <div className="flex items-center justify-between gap-item">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-9 w-36" />
          </div>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </section>

      {/* Instructions and notes section to mirror final part of the form. */}
      <section className="space-y-3">
        <Skeleton className="h-6 w-28" />
        <div className="section-container space-y-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      </section>

      {/* Bottom action placeholder for mobile fallback submit control. */}
      <div className="pb-2">
        <Skeleton className="h-10 w-36" />
      </div>
    </div>
  );
}
