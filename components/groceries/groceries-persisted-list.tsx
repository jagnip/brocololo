"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { getShoppingListById } from "@/lib/db/shopping-list";
import { GroceriesAllDoneState } from "@/components/groceries/groceries-all-done-state";
import { GroceriesPersistedItemRow } from "@/components/groceries/groceries-persisted-item-row";
import { GroceriesShowCompletedSwitch } from "@/components/groceries/groceries-show-completed-switch";
import { GroceriesViewLayoutControls } from "@/components/groceries/groceries-view-layout-controls";
import {
  shouldShowLayoutSwitcher,
  type GroceriesLayoutSwitcherPreset,
} from "@/components/groceries/groceries-layout-switcher";
import { useGroceriesLayoutSync } from "@/components/groceries/use-groceries-layout-sync";

export type GroceriesPersistedListModel = NonNullable<
  Awaited<ReturnType<typeof getShoppingListById>>
>;

type GroceriesPersistedListItem = GroceriesPersistedListModel["items"][number];

// Slightly longer than the row transition so collapse finishes before unmount.
const EXIT_ANIMATION_MS = 220;

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

  // Session-only: default hides bought items; no localStorage.
  const [showCompleted, setShowCompleted] = useState(false);
  const [purchasedOverrides, setPurchasedOverrides] = useState<
    Record<string, boolean>
  >({});
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());
  const [exitAnimatingIds, setExitAnimatingIds] = useState<Set<string>>(
    () => new Set(),
  );
  const exitTimeoutsRef = useRef<Map<string, number>>(new Map());

  const layoutPresets =
    layoutPresetsProp ??
    list.layoutPresets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      isBuiltIn: preset.isBuiltIn,
    }));
  const activeLayoutPresetId = activeLayoutPresetIdProp ?? list.activeLayoutPresetId;

  const isPurchased = useCallback(
    (row: GroceriesPersistedListItem) =>
      purchasedOverrides[row.id] ?? row.purchased,
    [purchasedOverrides],
  );

  const clearExitTimeout = useCallback((itemId: string) => {
    const timeoutId = exitTimeoutsRef.current.get(itemId);
    if (timeoutId != null) {
      window.clearTimeout(timeoutId);
      exitTimeoutsRef.current.delete(itemId);
    }
  }, []);

  const finishExit = useCallback((itemId: string) => {
    setExitingIds((prev) => {
      if (!prev.has(itemId)) return prev;
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
    setExitAnimatingIds((prev) => {
      if (!prev.has(itemId)) return prev;
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  }, []);

  const scheduleExit = useCallback(
    (itemId: string) => {
      clearExitTimeout(itemId);
      setExitingIds((prev) => {
        if (prev.has(itemId)) return prev;
        const next = new Set(prev);
        next.add(itemId);
        return next;
      });
      setExitAnimatingIds((prev) => {
        if (prev.has(itemId)) return prev;
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });

      // One frame at full opacity, then fade out.
      window.requestAnimationFrame(() => {
        setExitAnimatingIds((prev) => {
          if (prev.has(itemId)) return prev;
          const next = new Set(prev);
          next.add(itemId);
          return next;
        });
      });

      const timeoutId = window.setTimeout(() => {
        exitTimeoutsRef.current.delete(itemId);
        finishExit(itemId);
      }, EXIT_ANIMATION_MS);

      exitTimeoutsRef.current.set(itemId, timeoutId);
    },
    [clearExitTimeout, finishExit],
  );

  const cancelAllExits = useCallback(() => {
    for (const itemId of exitTimeoutsRef.current.keys()) {
      clearExitTimeout(itemId);
    }
    setExitingIds(new Set());
    setExitAnimatingIds(new Set());
  }, [clearExitTimeout]);

  const onPurchasedChange = useCallback(
    (itemId: string, purchased: boolean) => {
      setPurchasedOverrides((prev) => ({ ...prev, [itemId]: purchased }));

      if (purchased && !showCompleted) {
        scheduleExit(itemId);
        return;
      }

      clearExitTimeout(itemId);
      finishExit(itemId);
    },
    [clearExitTimeout, finishExit, scheduleExit, showCompleted],
  );

  const handleShowCompletedChange = useCallback(
    (checked: boolean) => {
      setShowCompleted(checked);
      if (checked) {
        cancelAllExits();
        return;
      }

      for (const item of items) {
        if (isPurchased(item)) {
          scheduleExit(item.id);
        }
      }
    },
    [cancelAllExits, isPurchased, items, scheduleExit],
  );

  useEffect(() => {
    const timeouts = exitTimeoutsRef.current;
    return () => {
      for (const timeoutId of timeouts.values()) {
        window.clearTimeout(timeoutId);
      }
      timeouts.clear();
    };
  }, []);

  const isRenderable = useCallback(
    (row: GroceriesPersistedListItem) =>
      showCompleted || !isPurchased(row) || exitingIds.has(row.id),
    [exitingIds, isPurchased, showCompleted],
  );

  const sections = useMemo(() => {
    const next: { title: string; rows: GroceriesPersistedListItem[] }[] = [];
    for (const item of items) {
      if (!isRenderable(item)) continue;
      const title = item.category.name;
      const last = next[next.length - 1];
      if (!last || last.title !== title) {
        next.push({ title, rows: [item] });
      } else {
        last.rows.push(item);
      }
    }
    return next;
  }, [isRenderable, items]);

  const showAllDone = useMemo(() => {
    if (showCompleted) return false;
    const hasPurchased = items.some((item) => isPurchased(item));
    const hasRenderable = items.some((item) => isRenderable(item));
    return hasPurchased && !hasRenderable;
  }, [isPurchased, isRenderable, items, showCompleted]);

  const showLayoutSwitcher = shouldShowLayoutSwitcher(layoutPresets);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          {showLayoutSwitcher ? (
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
          ) : null}
        </div>
        <GroceriesShowCompletedSwitch
          checked={showCompleted}
          onCheckedChange={handleShowCompletedChange}
        />
      </header>

      <div
        className="space-y-8 data-[pending=true]:animate-pulse"
        data-pending={isLayoutPending}
      >
        {showAllDone ? <GroceriesAllDoneState /> : null}
        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {section.title}
            </h2>
            {/* Row spacing lives on each <li> so exit animation can collapse margin too. */}
            <ul className="flex flex-col">
              {section.rows.map((row) => (
                <GroceriesPersistedItemRow
                  key={row.id}
                  row={row}
                  shareToken={shareToken}
                  showCompleted={showCompleted}
                  isAnimatingOut={exitAnimatingIds.has(row.id)}
                  onPurchasedChange={onPurchasedChange}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
