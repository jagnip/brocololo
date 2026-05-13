"use client";

import { useMemo } from "react";
import { TopbarConfigController } from "@/components/topbar-config";
import { ROUTES } from "@/lib/constants";
import { PLAN_TOPBAR_ACTIONS } from "@/components/planner/plan-topbar-config";

type PlanDetailTopbarConfigProps = {
  planDateRangeLabel: string;
};

/** Plan detail: same trail for Manage / Track; overwrites layout-only actions once mounted. */
export function PlanDetailTopbarConfig({
  planDateRangeLabel,
}: PlanDetailTopbarConfigProps) {
  const config = useMemo(
    () => ({
      actions: PLAN_TOPBAR_ACTIONS,
      breadcrumbs: [
        { label: "Meal plan", href: ROUTES.planCurrent },
        { label: planDateRangeLabel },
      ],
    }),
    [planDateRangeLabel],
  );

  return <TopbarConfigController config={config} />;
}
