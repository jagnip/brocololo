"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { TopbarConfigController } from "@/components/topbar-config";
import { ROUTES } from "@/lib/constants";

type GroceriesTopbarConfigProps = {
  planId: string;
  /** Same label as plan switcher / groceries list (e.g. "Jan 3 - Jan 9"). */
  planDateRangeLabel: string;
  /** True when the persisted list exists and has at least one item (matches prior “Edit groceries” gate). */
  canEdit: boolean;
};

/** Registers groceries top bar: plan switcher + “Edit groceries” on the view route when allowed. */
export function GroceriesTopbarConfig({
  planId,
  planDateRangeLabel,
  canEdit,
}: GroceriesTopbarConfigProps) {
  const pathname = usePathname();
  const isEditRoute = pathname.endsWith("/edit");

  const config = useMemo(() => {
    const actions = isEditRoute
      ? []
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

    const breadcrumbs = isEditRoute
      ? [
          { label: "Groceries", href: ROUTES.groceriesCurrent },
          {
            label: planDateRangeLabel,
            href: ROUTES.groceriesView(planId),
          },
          { label: "Edit groceries" },
        ]
      : [
          { label: "Groceries", href: ROUTES.groceriesCurrent },
          { label: planDateRangeLabel },
        ];

    return {
      breadcrumbs,
      actions,
    };
  }, [canEdit, isEditRoute, planDateRangeLabel, planId]);

  return <TopbarConfigController config={config} />;
}
