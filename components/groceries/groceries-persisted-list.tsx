"use client";

import { useState } from "react";
import type { getShoppingListById } from "@/lib/db/shopping-list";
import { GroceriesPersistedItemRow } from "@/components/groceries/groceries-persisted-item-row";
import { GroceriesViewLayoutControls } from "@/components/groceries/groceries-view-layout-controls";

export type GroceriesPersistedListModel = NonNullable<
  Awaited<ReturnType<typeof getShoppingListById>>
>;

/** Read-only groceries list from persisted `ShoppingList` rows (grouped by ingredient category). */
export function GroceriesPersistedList({
  list,
  shareToken,
}: {
  list: GroceriesPersistedListModel;
  shareToken?: string;
}) {
  const [isLayoutPending, setIsLayoutPending] = useState(false);
  const { plan, items } = list;

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
    <div className="space-y-6">
      <header className="flex justify-start">
        <GroceriesViewLayoutControls
          planId={plan.id}
          shareToken={shareToken}
          presets={list.layoutPresets.map((preset) => ({
            id: preset.id,
            name: preset.name,
            isBuiltIn: preset.isBuiltIn,
          }))}
          activePresetId={list.activeLayoutPresetId}
          onPendingChange={setIsLayoutPending}
        />
      </header>

      <div
        className="space-y-8 data-[pending=true]:animate-pulse"
        data-pending={isLayoutPending}
      >
        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {section.title}
            </h2>
            <ul className="flex flex-col gap-tight">
              {section.rows.map((row) => (
                <GroceriesPersistedItemRow
                  key={row.id}
                  row={row}
                  shareToken={shareToken}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
