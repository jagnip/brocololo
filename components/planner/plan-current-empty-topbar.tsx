"use client";

import { useMemo } from "react";
import { TopbarConfigController } from "@/components/topbar-config";
import { ROUTES } from "@/lib/constants";

export type PlanCurrentEmptyBreadcrumbContext = "meal-plan" | "groceries";

type PlanCurrentEmptyTopbarProps = {
  context: PlanCurrentEmptyBreadcrumbContext;
};

/** Registers top bar breadcrumbs when no plans exist (plan vs groceries entry). */
export function PlanCurrentEmptyTopbar({ context }: PlanCurrentEmptyTopbarProps) {
  const config = useMemo(
    () => ({
      actions: [],
      breadcrumbs:
        context === "meal-plan"
          ? [
              { label: "Meal plan", href: ROUTES.planCurrent },
              { label: "No plans yet" },
            ]
          : [
              { label: "Groceries", href: ROUTES.groceriesCurrent },
              { label: "No plans yet" },
            ],
    }),
    [context],
  );

  return <TopbarConfigController config={config} />;
}
