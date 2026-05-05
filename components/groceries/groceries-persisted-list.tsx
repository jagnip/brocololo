import Link from "next/link";
import { ArrowRightLeft, CircleAlert } from "lucide-react";
import type { getShoppingListByPlanId } from "@/lib/db/shopping-list";
import { formatAmount } from "@/lib/groceries/helpers";
import { getUnitDisplayName } from "@/lib/recipes/helpers";
import { IngredientIcon } from "@/components/ingredient-icon";

export type GroceriesPersistedListModel = NonNullable<
  Awaited<ReturnType<typeof getShoppingListByPlanId>>
>;

function formatDateRange(start: Date, end: Date): string {
  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();

  if (sameMonth) {
    // Match requested format like "2 - 7 May".
    const month = end.toLocaleDateString("en-US", { month: "short" });
    return `${start.getDate()} - ${end.getDate()} ${month}`;
  }

  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endStr = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${startStr} - ${endStr}`;
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
      </header>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {section.title}
            </h2>
            <ul className="divide-y">
              {section.rows.map((row) => {
                const ing = row.groceryIngredient?.ingredient;
                const icon = ing?.icon ?? null;
                const url = ing?.supermarketUrl ?? null;
                const displayUnit = getUnitDisplayName({
                  amount: row.amount,
                  unitName: row.unit?.name ?? null,
                  // Use irregular plural labels when available.
                  unitNamePlural: row.unit?.namePlural ?? null,
                });
                const amountRight =
                  row.amount !== null
                    ? `${formatAmount(row.amount)} ${displayUnit}`.trim()
                    : (displayUnit || "—");

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
                        {row.additionalInfo ? (
                          <p className="mt-1 flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400">
                            <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
                            {row.additionalInfo}
                          </p>
                        ) : null}
                        {row.substitutionsAllowed && row.substitutionNote ? (
                          <p className="mt-1 flex items-center gap-2 text-sm text-primary">
                            <ArrowRightLeft className="h-4 w-4 shrink-0" aria-hidden />
                            {row.substitutionNote}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums">
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
