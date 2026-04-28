import {
  getIngredientCategories,
  getIngredientsPage,
} from "@/lib/db/ingredients";
import { PageHeader } from "@/components/page-header";
import { IngredientsInfiniteList } from "@/components/ingredients/ingredients-infinite-list";
import { IngredientsFilterBar } from "@/components/ingredients/ingredients-filter-bar";

type IngredientsPageContainerProps = {
  q?: string;
  // Optional category filter slug coming from the URL (`?category=<slug>`).
  categorySlug?: string;
};

const PAGE_SIZE = 25;

export async function IngredientsPageContainer({
  q,
  categorySlug,
}: IngredientsPageContainerProps) {
  // Run the page fetch and the category list in parallel; they have no data dependency.
  const [data, categories] = await Promise.all([
    getIngredientsPage({
      q,
      categorySlug,
      page: 1,
      pageSize: PAGE_SIZE,
    }),
    getIngredientCategories(),
  ]);

  return (
    <>
      {/* Page spacing is owned by the route-level page-container. */}
      <header className="w-full">
        {/* Match recipe-page header bottom spacing for consistent vertical rhythm. */}
        <PageHeader title="Ingredients" className="pb-2" />
      </header>

      {/* `group` wires descendant `data-pending=true` (from SearchInput + filter bar)
          to the list pulse selector — same pattern as /recipes. */}
      <div className="group">
        <IngredientsFilterBar
          categories={categories}
          selectedSlug={categorySlug}
        />

        <IngredientsInfiniteList
          initialData={data}
          q={q}
          categorySlug={categorySlug}
        />
      </div>
    </>
  );
}
