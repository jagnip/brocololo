import { FiltersSkeleton } from "@/components/recipe-header/filters-skeleton";
import SearchSkeleton from "@/components/recipe-header/search/search-skeleton";
import GridSkeleton from "@/components/recipes/grid-skeleton";

export default function Loading() {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 bg-background py-4 px-4 w-full">
        <SearchSkeleton />
        <FiltersSkeleton />
      </div>
      <GridSkeleton />
    </>
  );
}
