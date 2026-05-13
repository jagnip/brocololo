"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { TopbarConfigController } from "@/components/topbar-config";
import { ROUTES } from "@/lib/constants";

type GroceriesTopbarConfigProps = {
  planId: string;
  /** True when the persisted list exists and has at least one item (matches prior “Edit groceries” gate). */
  canEdit: boolean;
};

/** Registers groceries top bar: plan switcher + view/edit actions by route. */
export function GroceriesTopbarConfig({
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
      actions,
    };
  }, [canEdit, isEditRoute, planId]);

  return <TopbarConfigController config={config} />;
}
