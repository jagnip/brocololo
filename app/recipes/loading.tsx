import GridSkeleton from "@/components/recipes/grid-skeleton";
import { TabsSkeleton } from "@/components/recipes/tabs/skeleton";

export default function Loading() {
  return (
    <>
      <TabsSkeleton />
      <GridSkeleton />
    </>
  );
}
