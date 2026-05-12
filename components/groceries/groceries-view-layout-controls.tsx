"use client";

import { useEffect, useMemo, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setShoppingLayoutPresetAction } from "@/actions/shopping-list-actions";
import {
  GroceriesLayoutSelector,
  type GroceriesLayoutPresetOption,
} from "@/components/groceries/groceries-layout-selector";

type GroceriesViewLayoutControlsProps = {
  planId: string;
  presets: GroceriesLayoutPresetOption[];
  activePresetId: string | null;
  onPendingChange?: (isPending: boolean) => void;
};

export function GroceriesViewLayoutControls({
  planId,
  presets,
  activePresetId,
  onPendingChange,
}: GroceriesViewLayoutControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticPresetId, setOptimisticPresetId] = useOptimistic(activePresetId);

  const safePresetId = useMemo(
    () => optimisticPresetId ?? presets[0]?.id ?? null,
    [optimisticPresetId, presets],
  );

  const onPresetChange = (presetId: string) => {
    // Optimistically reflect selection in the topbar before server revalidation completes.
    setOptimisticPresetId(presetId);
    startTransition(async () => {
      const result = await setShoppingLayoutPresetAction({ planId, presetId });
      if (result.type === "error") {
        toast.error(result.message);
        return;
      }
      router.refresh();
    });
  };

  useEffect(() => {
    // Bubble transition state up so the persisted list can show the same
    // pending pulse pattern used in other list/filter UIs.
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  return (
    <GroceriesLayoutSelector
      presets={presets}
      value={safePresetId}
      onValueChange={onPresetChange}
      disabled={isPending || presets.length === 0}
      triggerClassName="w-[200px]"
    />
  );
}
