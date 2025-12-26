import CategorySkeleton from "@/components/recipes/filters-skeleton";
import GridSkeleton from "@/components/recipes/grid-skeleton";

export default function Loading() {
  return (
    <>
      <CategorySkeleton />
      <GridSkeleton />
    </>
  );
}
