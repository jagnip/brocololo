import CategorySkeleton from "@/components/recipes/category-skeleton";
import GridSkeleton from "@/components/recipes/grid-skeleton";

export default function Loading() {
  return (
    <>
      <CategorySkeleton />
      <GridSkeleton />
    </>
  );
}
