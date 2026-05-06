import Link from "next/link";
import type { getShoppingListByPlanId } from "@/lib/db/shopping-list";
import { GroceriesPersistedItemRow } from "@/components/groceries/groceries-persisted-item-row";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

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
      <header className="flex items-start justify-between gap-3">
        <h1 className="type-h1">Groceries for {rangeLabel}</h1>
        {/* Split edit mode onto a dedicated route to keep view mode focused. */}
        <Button asChild variant="outline">
          <Link href={ROUTES.groceriesEdit(plan.id)}>Edit list</Link>
        </Button>
      </header>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {section.title}
            </h2>
            <ul className="divide-y">
              {section.rows.map((row) => (
                <GroceriesPersistedItemRow key={row.id} row={row} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
