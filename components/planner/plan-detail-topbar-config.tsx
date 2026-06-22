"use client";

import { useMemo } from "react";
import { TopbarConfigController } from "@/components/topbar-config";
import { ROUTES } from "@/lib/constants";
import { PLAN_TOPBAR_ACTIONS } from "@/components/planner/plan-topbar-config";
import type { BreadcrumbSelectOption } from "@/components/ui/breadcrumb-select";

type PlanDetailTopbarConfigProps = {
  planId: string;
  planDateRangeLabel: string;
  planOptions: BreadcrumbSelectOption[];
};

/** Plan detail: same trail for Manage / Track; plan switcher lives on the leaf breadcrumb. */
export function PlanDetailTopbarConfig({
  planId,
  planDateRangeLabel,
  planOptions,
}: PlanDetailTopbarConfigProps) {
  const config = useMemo(
    () => ({
      actions: PLAN_TOPBAR_ACTIONS,
      breadcrumbs: [
        { label: "Meal plan", href: ROUTES.planCurrent },
        {
          label: planDateRangeLabel,
          select: { kind: "plan" as const, options: planOptions, currentId: planId },
        },
      ],
    }),
    [planDateRangeLabel, planId, planOptions],
  );

  return <TopbarConfigController config={config} />;
}
