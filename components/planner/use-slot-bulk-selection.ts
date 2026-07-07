"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UseSlotBulkSelectionOptions = {
  orderedKeys: string[];
  onSelectionClearedByRebuild?: () => void;
};

export function useSlotBulkSelection({
  orderedKeys,
  onSelectionClearedByRebuild,
}: UseSlotBulkSelectionOptions) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [anchorKey, setAnchorKey] = useState<string | null>(null);
  const previousOrderedSignatureRef = useRef<string | null>(null);

  const keyToIndex = useMemo(() => {
    const map = new Map<string, number>();
    orderedKeys.forEach((key, index) => map.set(key, index));
    return map;
  }, [orderedKeys]);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
    setAnchorKey(null);
  }, []);

  const setSelectionForKey = useCallback((key: string, checked: boolean) => {
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
    setAnchorKey(key);
  }, []);

  const shiftSelectToKey = useCallback(
    (key: string) => {
      const targetIndex = keyToIndex.get(key);
      const anchorIndex = anchorKey ? keyToIndex.get(anchorKey) : undefined;
      if (targetIndex == null || anchorIndex == null) {
        setSelectionForKey(key, true);
        return;
      }

      const start = Math.min(anchorIndex, targetIndex);
      const end = Math.max(anchorIndex, targetIndex);
      const rangeKeys = orderedKeys.slice(start, end + 1);
      setSelectedKeys((previous) => {
        const next = new Set(previous);
        rangeKeys.forEach((rangeKey) => next.add(rangeKey));
        return next;
      });
      setAnchorKey(key);
    },
    [anchorKey, keyToIndex, orderedKeys, setSelectionForKey],
  );

  useEffect(() => {
    const signature = orderedKeys.join("|");
    if (previousOrderedSignatureRef.current == null) {
      previousOrderedSignatureRef.current = signature;
      return;
    }
    if (previousOrderedSignatureRef.current === signature) {
      return;
    }

    previousOrderedSignatureRef.current = signature;
    if (selectedKeys.size === 0) {
      return;
    }

    clearSelection();
    onSelectionClearedByRebuild?.();
  }, [clearSelection, onSelectionClearedByRebuild, orderedKeys, selectedKeys.size]);

  const selectedCount = selectedKeys.size;

  return {
    selectedKeys,
    selectedCount,
    isSelected: (key: string) => selectedKeys.has(key),
    clearSelection,
    setSelectionForKey,
    shiftSelectToKey,
  };
}
