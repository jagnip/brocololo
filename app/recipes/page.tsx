import GridSkeleton from "@/components/recipes/grid-skeleton";
import RecipeGrid from "@/components/recipes/grid";
import { Suspense } from "react";

// TBD weird caching behavior, need to investigate
// export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <>
      <Suspense fallback={<GridSkeleton />}>
        <RecipeGrid />
      </Suspense>
    </>
  );
}
