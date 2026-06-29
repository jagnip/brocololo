"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GroceriesPersistedListModel } from "@/components/groceries/groceries-persisted-list";
import { getGroceriesLayoutDisplayFingerprint } from "@/lib/groceries/layout-display-fingerprint";

const LAYOUT_SYNC_TIMEOUT_MS = 10_000;

/** Keeps layout pulse active until refreshed list props actually change (or timeout). */
export function useGroceriesLayoutSync(list: GroceriesPersistedListModel) {
  const router = useRouter();
  const [isLayoutSyncPending, setIsLayoutSyncPending] = useState(false);
  const syncBaselineRef = useRef<string | null>(null);

  const layoutFingerprint = useMemo(
    () => getGroceriesLayoutDisplayFingerprint(list),
    [list],
  );

  const beginLayoutSync = useCallback(() => {
    syncBaselineRef.current = getGroceriesLayoutDisplayFingerprint(list);
    setIsLayoutSyncPending(true);
  }, [list]);

  const cancelLayoutSync = useCallback(() => {
    syncBaselineRef.current = null;
    setIsLayoutSyncPending(false);
  }, []);

  const completeLayoutSync = useCallback(async () => {
    await router.refresh();
  }, [router]);

  // Stop pulsing once server props reflect the layout change.
  useEffect(() => {
    if (!isLayoutSyncPending || syncBaselineRef.current === null) {
      return;
    }
    if (layoutFingerprint !== syncBaselineRef.current) {
      syncBaselineRef.current = null;
      setIsLayoutSyncPending(false);
    }
  }, [isLayoutSyncPending, layoutFingerprint]);

  // Safety net if the visual layout is unchanged (e.g. same category order).
  useEffect(() => {
    if (!isLayoutSyncPending) {
      return;
    }
    const timeout = window.setTimeout(() => {
      syncBaselineRef.current = null;
      setIsLayoutSyncPending(false);
    }, LAYOUT_SYNC_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [isLayoutSyncPending]);

  return {
    isLayoutSyncPending,
    beginLayoutSync,
    cancelLayoutSync,
    completeLayoutSync,
  };
}
