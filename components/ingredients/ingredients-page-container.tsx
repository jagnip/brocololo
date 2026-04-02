import Link from "next/link";
import { Pencil } from "lucide-react";
import { SearchInput } from "@/components/search";
import { IngredientIcon } from "@/components/ingredient-icon";
import { getIngredientDisplayName } from "@/lib/ingredients/format";
import { getIngredientsPage } from "@/lib/db/ingredients";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";

type IngredientsPageContainerProps = {
  q?: string;
  page?: string;
};

const PAGE_SIZE = 25;
const INGREDIENTS_ROUTE = "/ingredients";

export async function IngredientsPageContainer({
  q,
  page,
}: IngredientsPageContainerProps) {
  const pageNumber = Number(page ?? "1");

  const data = await getIngredientsPage({
    q,
    page: Number.isFinite(pageNumber) ? pageNumber : 1,
    pageSize: PAGE_SIZE,
  });

  // Keep current search query while moving through pages.
  const getPageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q?.trim()) params.set("q", q.trim());
    params.set("page", String(targetPage));
    return `${INGREDIENTS_ROUTE}?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Ingredients</h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button asChild>
            {/* Top-level entry point for ingredient creation. */}
            <Link href={ROUTES.ingredientCreate}>
              Create ingredient
            </Link>
          </Button>
          <SearchInput
            placeholder="Search ingredient names..."
            pathOverride={INGREDIENTS_ROUTE}
            queryParam="q"
            resetParamsOnChange={["page"]}
            className="w-full max-w-sm"
          />
        </div>
      </header>

      <p className="text-sm text-muted-foreground">
        Showing {data.items.length} of {data.total} ingredients
      </p>

      <div className="rounded-lg border">
        <ul className="divide-y">
          {data.items.map((ingredient) => (
            <li key={ingredient.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex items-start gap-3">
                  <IngredientIcon icon={ingredient.icon} name={ingredient.name} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">
                        {getIngredientDisplayName(ingredient.name, ingredient.brand)}
                      </p>
                      <Link
                        href={ROUTES.ingredientEdit(ingredient.slug)}
                        aria-label={`Edit ${ingredient.name}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      Category: {ingredient.category.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Slug: {ingredient.slug}
                    </p>
                    {ingredient.supermarketUrl && (
                      <a
                        href={ingredient.supermarketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Supermarket link
                      </a>
                    )}
                  </div>
                </div>

                <div className="text-xs">
                  {/* Show nutrition details clearly per ingredient. */}
                  <p className="font-medium mb-1">Nutrition (per 100g)</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
                    <span>Calories</span>
                    <span>{ingredient.calories}</span>
                    <span>Protein</span>
                    <span>{ingredient.proteins}g</span>
                    <span>Fat</span>
                    <span>{ingredient.fats}g</span>
                    <span>Carbs</span>
                    <span>{ingredient.carbs}g</span>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                {/* Show exact conversion values as grams per unit. */}
                <p className="text-xs font-medium mb-1">Conversions</p>
                {ingredient.unitConversions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No conversions configured
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {ingredient.unitConversions.map((uc) => (
                      <li
                        key={`${ingredient.id}-${uc.unitId}`}
                        className="text-xs rounded bg-muted px-2 py-1"
                      >
                        1 {uc.unit.name} = {uc.gramsPerUnit} g
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}

          {data.items.length === 0 && (
            <li className="p-6 text-sm text-muted-foreground">
              No ingredients found.
            </li>
          )}
        </ul>
      </div>

      <nav className="flex items-center justify-between">
        <Link
          href={getPageHref(Math.max(1, data.page - 1))}
          aria-disabled={data.page <= 1}
          className={`text-sm ${
            data.page <= 1 ? "pointer-events-none opacity-50" : "underline"
          }`}
        >
          Previous
        </Link>

        <span className="text-sm text-muted-foreground">
          Page {data.page} of {data.totalPages}
        </span>

        <Link
          href={getPageHref(Math.min(data.totalPages, data.page + 1))}
          aria-disabled={data.page >= data.totalPages}
          className={`text-sm ${
            data.page >= data.totalPages ? "pointer-events-none opacity-50" : "underline"
          }`}
        >
          Next
        </Link>
      </nav>
    </div>
  );
}
