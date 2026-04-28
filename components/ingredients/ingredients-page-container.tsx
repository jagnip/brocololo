import { SearchInput } from "@/components/search";
import { getIngredientsPage } from "@/lib/db/ingredients";
import { PageHeader } from "@/components/page-header";
import { IngredientsInfiniteList } from "@/components/ingredients/ingredients-infinite-list";

type IngredientsPageContainerProps = {
  q?: string;
};

const PAGE_SIZE = 25;
const INGREDIENTS_ROUTE = "/ingredients";

export async function IngredientsPageContainer({
  q,
}: IngredientsPageContainerProps) {
  const data = await getIngredientsPage({
    q,
    page: 1,
    pageSize: PAGE_SIZE,
  });

  return (
    <>
      {/* Page spacing is owned by the route-level page-container. */}
      <header className="w-full">
        {/* Match recipe-page header bottom spacing for consistent vertical rhythm. */}
        <PageHeader title="Ingredients" className="pb-2" />
      </header>
      {/* Keep search directly under the page header for clearer hierarchy. */}
      <div className="w-full">
        <SearchInput
          placeholder="Search by ingredient names"
          pathOverride={INGREDIENTS_ROUTE}
          queryParam="q"
          resetParamsOnChange={["page"]}
          className="w-full"
        />
      </div>

      <IngredientsInfiniteList initialData={data} q={q} />
    </>
  );
}
