"use client";

import type { getShoppingListById } from "@/lib/db/shopping-list";
import { GroceriesPersistedItemRow } from "@/components/groceries/groceries-persisted-item-row";
import { GroceriesViewLayoutControls } from "@/components/groceries/groceries-view-layout-controls";
import {
  shouldShowLayoutSwitcher,
  type GroceriesLayoutSwitcherPreset,
} from "@/components/groceries/groceries-layout-switcher";
import { useGroceriesLayoutSync } from "@/components/groceries/use-groceries-layout-sync";

export type GroceriesPersistedListModel = NonNullable<
  Awaited<ReturnType<typeof getShoppingListById>>
>;

type GroceriesPersistedListProps = {
  list: GroceriesPersistedListModel;
  shareToken?: string;
  /** When provided, parent owns layout pending state (view shell). */
  isLayoutPending?: boolean;
  beginLayoutSync?: () => void;
  completeLayoutSync?: () => Promise<void>;
  cancelLayoutSync?: () => void;
  /** Optimistic overrides from parent during dialog save/create/delete. */
  layoutPresets?: GroceriesLayoutSwitcherPreset[];
  activeLayoutPresetId?: string | null;
};

/** Read-only groceries list from persisted `ShoppingList` rows (grouped by ingredient category). */
export function GroceriesPersistedList({
  list,
  shareToken,
  isLayoutPending: isLayoutPendingProp,
  beginLayoutSync: beginLayoutSyncProp,
  completeLayoutSync: completeLayoutSyncProp,
  cancelLayoutSync: cancelLayoutSyncProp,
  layoutPresets: layoutPresetsProp,
  activeLayoutPresetId: activeLayoutPresetIdProp,
}: GroceriesPersistedListProps) {
  const internalLayoutSync = useGroceriesLayoutSync(list);
  const beginLayoutSync = beginLayoutSyncProp ?? internalLayoutSync.beginLayoutSync;
  const completeLayoutSync =
    completeLayoutSyncProp ?? internalLayoutSync.completeLayoutSync;
  const cancelLayoutSync = cancelLayoutSyncProp ?? internalLayoutSync.cancelLayoutSync;
  const isLayoutPending = isLayoutPendingProp ?? internalLayoutSync.isLayoutSyncPending;
  const { plan, items } = list;

  const layoutPresets =
    layoutPresetsProp ??
    list.layoutPresets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      isBuiltIn: preset.isBuiltIn,
    }));
  const activeLayoutPresetId = activeLayoutPresetIdProp ?? list.activeLayoutPresetId;

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

  const showLayoutSwitcher = shouldShowLayoutSwitcher(layoutPresets);

  return (
    <div className="space-y-6">
      {showLayoutSwitcher ? (
        <header className="flex justify-start">
          <GroceriesViewLayoutControls
            planId={plan.id}
            shareToken={shareToken}
            presets={layoutPresets}
            activePresetId={activeLayoutPresetId}
            isLayoutPending={isLayoutPending}
            beginLayoutSync={beginLayoutSync}
            completeLayoutSync={completeLayoutSync}
            cancelLayoutSync={cancelLayoutSync}
          />
        </header>
      ) : null}

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
