"use client";

import { useEffect, useMemo, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setShoppingLayoutPresetByShareAction } from "@/actions/shopping-list-share-actions";
import { setShoppingLayoutPresetAction } from "@/actions/shopping-list-actions";
import {
  GroceriesLayoutSwitcher,
  type GroceriesLayoutSwitcherPreset,
} from "@/components/groceries/groceries-layout-switcher";

type GroceriesViewLayoutControlsProps = {
  planId: string;
  shareToken?: string;
  presets: GroceriesLayoutSwitcherPreset[];
  activePresetId: string | null;
  onAddLayout?: () => void;
  /** Parent-owned pending (e.g. dialog save/delete); merged with in-switch pending. */
  isLayoutPending?: boolean;
  onPendingChange?: (isPending: boolean) => void;
};

export function GroceriesViewLayoutControls({
  planId,
  shareToken,
  presets,
  activePresetId,
  onAddLayout,
  isLayoutPending = false,
  onPendingChange,
}: GroceriesViewLayoutControlsProps) {
  const router = useRouter();
  const [isSwitchPending, startTransition] = useTransition();
  const [optimisticPresetId, setOptimisticPresetId] = useOptimistic(activePresetId);

  const safePresetId = useMemo(
    () => optimisticPresetId ?? presets[0]?.id ?? null,
    [optimisticPresetId, presets],
  );

  const onPresetChange = (presetId: string) => {
    setOptimisticPresetId(presetId);
    startTransition(async () => {
      const result = shareToken
        ? await setShoppingLayoutPresetByShareAction({
            token: shareToken,
            presetId,
          })
        : await setShoppingLayoutPresetAction({ planId, presetId });
      if (result.type === "error") {
        toast.error(result.message);
        return;
      }
      router.refresh();
    });
  };

  useEffect(() => {
    onPendingChange?.(isSwitchPending);
  }, [isSwitchPending, onPendingChange]);

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
