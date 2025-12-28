import CategorySkeleton from "@/components/recipe-header/filters-skeleton";
import GridSkeleton from "@/components/recipes/recipe-grid-skeleton";

export default function Loading() {
  return (
    <>
      <CategorySkeleton />
      <GridSkeleton />
    </>
  );
}
