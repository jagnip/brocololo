import GridSkeleton from "@/components/recipes/grid-skeleton";
import { TabsSkeleton } from "@/components/recipes/tabs-skeleton";

export function RecipesPageSkeleton() {
  return (
    <>
      <TabsSkeleton />
      <GridSkeleton />
    </>
  );
}
