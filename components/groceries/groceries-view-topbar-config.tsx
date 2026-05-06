"use client";

import { useMemo } from "react";
import { GroceriesViewLayoutControls } from "@/components/groceries/groceries-view-layout-controls";
import type { GroceriesLayoutPresetOption } from "@/components/groceries/groceries-layout-selector";
import { TopbarConfigController } from "@/components/topbar-config";
import { ROUTES } from "@/lib/constants";

type GroceriesViewTopbarConfigProps = {
  planId: string;
  presets: GroceriesLayoutPresetOption[];
  activePresetId: string | null;
};

export function GroceriesViewTopbarConfig({
  planId,
  presets,
  activePresetId,
}: GroceriesViewTopbarConfigProps) {
  const config = useMemo(
    () => ({
      rightContent: (
        <GroceriesViewLayoutControls
          planId={planId}
          presets={presets}
          activePresetId={activePresetId}
        />
      ),
      actions: [
        {
          id: "edit-groceries",
          label: "Edit groceries",
          href: ROUTES.groceriesEdit(planId),
          variant: "outline" as const,
          size: "default" as const,
        },
      ],
    }),
    [activePresetId, planId, presets],
  );

  return <TopbarConfigController config={config} />;
}
