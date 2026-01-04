import { Suspense } from "react";
import RecipeTabs from "./tabs";
import { TabsSkeleton } from "./tabs-skeleton";

export default function RecipeHeader({
  activeCategory,
}: {
  activeCategory: string;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between sticky top-0 z-10 bg-background py-4 px-4 w-full">
      <Suspense fallback={<TabsSkeleton />}>
        <RecipeTabs activeCategory={activeCategory} />
      </Suspense>
    </header>
  );
}
