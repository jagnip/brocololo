import CategorySkeleton from "@/components/recipe-filters/filters-skeleton";
import GridSkeleton from "@/components/recipes/grid-skeleton";

export default function Loading() {
  return (
    <>
      <CategorySkeleton />
      <GridSkeleton />
    </>
  );
}
