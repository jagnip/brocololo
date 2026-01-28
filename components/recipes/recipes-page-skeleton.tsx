import GridSkeleton from "@/components/recipes/grid-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsSkeleton } from "@/components/recipes/tabs-skeleton";

export function RecipesPageSkeleton() {
  return (
    <div className="space-y-4">
      {/* Mirror sticky header row with tabs/search on left and action on right. */}
      <div className="px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <TabsSkeleton />
          </div>
          <Skeleton
            className="h-10 w-32 rounded-md"
            data-slot="recipes-create-action-skeleton"
          />
        </div>
      </div>
      <GridSkeleton />
    </div>
  );
}
