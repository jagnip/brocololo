import CategorySkeleton from "@/components/recipe-filters/filters-skeleton";
import GridSkeleton from "@/components/recipes/recipe-grid-skeleton";

export default function Loading() {
  return (
    <>
      <CategorySkeleton />
      <GridSkeleton />
    </>
  );
}
