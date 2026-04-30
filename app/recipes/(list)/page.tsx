import RecipeGridContainer from "@/components/recipes/grid-container";
import { Suspense } from "react";
import { RecipeTabsContainer } from "@/components/recipes/tabs-container";
import { RecipesPageSkeleton } from "@/components/recipes/recipes-page-skeleton";
import { TopbarConfigController } from "@/components/topbar-config";
import { ROUTES } from "@/lib/constants";

type RecipesPageSearchParams = {
  occasion?: string;
  q?: string;
  protein?: string;
  type?: string;
  time?: string;
};

type RecipesPageProps = {
  searchParams: Promise<RecipesPageSearchParams>;
};

export default async function Page({ searchParams }: RecipesPageProps) {
  const { occasion, q: search, protein, type, time } = await searchParams;

  return (
    <>
      <TopbarConfigController
        config={{
          actions: [
            {
              id: "create-recipe",
              label: "Create recipe",
              href: ROUTES.recipeCreate,
              variant: "outline",
              size: "default",
            },
          ],
        }}
      />
      <Suspense fallback={<RecipesPageSkeleton />}>
        {/* Keep tab and grid composition unchanged while moving to route group. */}
        <div className="group">
          <RecipeTabsContainer />
          <RecipeGridContainer
            occasion={occasion}
            search={search}
            protein={protein}
            type={type}
            time={time}
          />
        </div>
      </Suspense>
    </>
  );
}
