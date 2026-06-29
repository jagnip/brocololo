"use client";

import { useMemo, useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { setShoppingLayoutPresetByShareAction } from "@/actions/shopping-list-share-actions";
import { setShoppingLayoutPresetAction } from "@/actions/shopping-list-actions";
import {
  GroceriesLayoutSwitcher,
  shouldShowLayoutSwitcher,
  type GroceriesLayoutSwitcherPreset,
} from "@/components/groceries/groceries-layout-switcher";

type GroceriesViewLayoutControlsProps = {
  planId: string;
  shareToken?: string;
  presets: GroceriesLayoutSwitcherPreset[];
  activePresetId: string | null;
  onAddLayout?: () => void;
  isLayoutPending?: boolean;
  beginLayoutSync?: () => void;
  completeLayoutSync?: () => Promise<void>;
  cancelLayoutSync?: () => void;
};

export function GroceriesViewLayoutControls({
  planId,
  shareToken,
  presets,
  activePresetId,
  onAddLayout,
  isLayoutPending = false,
  beginLayoutSync,
  completeLayoutSync,
  cancelLayoutSync,
}: GroceriesViewLayoutControlsProps) {
  const [isSwitchPending, startTransition] = useTransition();
  const [optimisticPresetId, setOptimisticPresetId] = useOptimistic(activePresetId);

  const safePresetId = useMemo(
    () => optimisticPresetId ?? presets[0]?.id ?? null,
    [optimisticPresetId, presets],
  );

  const onPresetChange = (presetId: string) => {
    beginLayoutSync?.();
    setOptimisticPresetId(presetId);
    startTransition(async () => {
      const result = shareToken
        ? await setShoppingLayoutPresetByShareAction({
            token: shareToken,
            presetId,
          })
        : await setShoppingLayoutPresetAction({ planId, presetId });
      if (result.type === "error") {
        cancelLayoutSync?.();
        toast.error(result.message);
        return;
      }
      if (completeLayoutSync) {
        await completeLayoutSync();
        return;
      }
    });
  };

  if (!shouldShowLayoutSwitcher(presets)) {
    return null;
  }

  return (
    <GroceriesLayoutSwitcher
      presets={presets}
      activePresetId={safePresetId}
      onPresetChange={onPresetChange}
      onAddLayout={onAddLayout}
      disabled={isSwitchPending || isLayoutPending || presets.length === 0}
    />
  );
}
