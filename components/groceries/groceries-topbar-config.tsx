"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { GroceriesTopbarControls } from "@/components/groceries/groceries-topbar-controls";
import type { GroceriesPlanSelectOption } from "@/components/groceries/groceries-plan-select";
import { TopbarConfigController } from "@/components/topbar-config";
import { ROUTES } from "@/lib/constants";

type GroceriesTopbarConfigProps = {
  planOptions: GroceriesPlanSelectOption[];
  planId: string;
  /** True when the persisted list exists and has at least one item (matches prior “Edit groceries” gate). */
  canEdit: boolean;
};

/** Registers groceries top bar: plan switcher + view/edit actions by route. */
export function GroceriesTopbarConfig({
  planOptions,
  planId,
  canEdit,
}: GroceriesTopbarConfigProps) {
  const pathname = usePathname();
  const isEditRoute = pathname.endsWith("/edit");

  const config = useMemo(() => {
    const actions = isEditRoute
      ? [
          {
            id: "view-groceries",
            label: "View list",
            href: ROUTES.groceriesView(planId),
            variant: "outline" as const,
            size: "default" as const,
            ariaLabel: "View grocery list",
          },
        ]
      : canEdit
        ? [
            {
              id: "edit-groceries",
              label: "Edit groceries",
              href: ROUTES.groceriesEdit(planId),
              variant: "outline" as const,
              size: "default" as const,
            },
          ]
        : [];

    return {
      rightContent: (
        <GroceriesTopbarControls planOptions={planOptions} planId={planId} />
      ),
      actions,
    };
  }, [canEdit, isEditRoute, planId, planOptions]);

  return <TopbarConfigController config={config} />;
}
