import Link from "next/link";
import type { getShoppingListByPlanId } from "@/lib/db/shopping-list";
import { formatAmount } from "@/lib/groceries/helpers";
import { IngredientIcon } from "@/components/ingredient-icon";

export type GroceriesPersistedListModel = NonNullable<
  Awaited<ReturnType<typeof getShoppingListByPlanId>>
>;

function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const startStr = start.toLocaleDateString("en-US", options);
  const endStr = end.toLocaleDateString("en-US", options);
  return `${startStr} – ${endStr}`;
}

/** Read-only groceries list from persisted `ShoppingList` rows (grouped by ingredient category). */
export function GroceriesPersistedList({ list }: { list: GroceriesPersistedListModel }) {
  const { plan, items } = list;
  const rangeLabel = formatDateRange(plan.startDate, plan.endDate);

  const sections: { title: string; rows: typeof items }[] = [];
  for (const item of items) {
    const title = item.category.name;
    const last = sections[sections.length - 1];
    if (!last || last.title !== title) {
      sections.push({ title, rows: [item] });
    } else {
      last.rows.push(item);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="type-h1">Groceries for {rangeLabel}</h1>
        <p className="text-sm text-muted-foreground">
          From your meal plan — grouped by ingredient category.
        </p>
      </header>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {section.title}
            </h2>
            <ul className="divide-y rounded-xl border bg-card">
              {section.rows.map((row) => {
                const ing = row.groceryIngredient?.ingredient;
                const icon = ing?.icon ?? null;
                const url = ing?.supermarketUrl ?? null;
                const amountRight =
                  row.amount !== null
                    ? `${formatAmount(row.amount)} ${row.unit?.name ?? ""}`.trim()
                    : (row.unit?.name ?? "—");

                return (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <IngredientIcon icon={icon} name={row.displayLabel} />
                      <div className="min-w-0">
                        {url ? (
                          <Link
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary underline-offset-4 hover:underline"
                          >
                            {row.displayLabel}
                          </Link>
                        ) : (
                          <span className="font-medium">{row.displayLabel}</span>
                        )}
                        {row.recipeAttribution ? (
                          <p className="truncate text-sm text-muted-foreground">
                            {row.recipeAttribution}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {amountRight}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
