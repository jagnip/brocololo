import { GroceriesPlanSkeleton } from "@/components/groceries/groceries-plan-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  // Mirror the topbar row (layout selector + edit button) so route transitions
  // don't flash empty space before TopbarConfigController mounts.
  return (
    <div className="page-container space-y-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-32" />
      </div>
      <GroceriesPlanSkeleton />
    </div>
  );
}
