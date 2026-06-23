"use client";

import { useMemo } from "react";
import { TopbarConfigController } from "@/components/topbar-config";
import { ROUTES } from "@/lib/constants";
import { PLAN_TOPBAR_ACTIONS } from "@/components/planner/plan-topbar-config";
import { usePlanTopbarState } from "@/components/planner/plan-topbar-state-context";
import type { BreadcrumbSelectOption } from "@/components/ui/breadcrumb-select";

type PlanDetailTopbarConfigProps = {
  planId: string;
  planDateRangeLabel: string;
  planOptions: BreadcrumbSelectOption[];
};

/** Plan detail: Create plan + overflow actions; plan switcher lives on the leaf breadcrumb. */
export function PlanDetailTopbarConfig({
  planId,
  planDateRangeLabel,
  planOptions,
}: PlanDetailTopbarConfigProps) {
  const { state } = usePlanTopbarState();

  const generateGroceryLabel = state.isGenerating
    ? "Generating…"
    : state.isLoadingMeals
      ? "Loading…"
      : "Generate grocery list";

  const config = useMemo(
    () => ({
      actions: PLAN_TOPBAR_ACTIONS,
      overflowMenu: {
        ariaLabel: "Meal plan actions",
        items: [
          {
            id: "edit-dates",
            label: "Edit dates",
            disabled: state.isEditDatesDisabled,
            onSelect: state.onEditDates,
          },
          {
            id: "generate-grocery-list",
            label: generateGroceryLabel,
            disabled:
              state.isGenerateDisabled ||
              state.isGenerating ||
              state.isLoadingMeals ||
              state.isDeleting,
            onSelect: state.onGenerateGroceryList,
          },
          {
            id: "delete-plan",
            label: "Delete plan",
            destructive: true,
            disabled: state.isDeleteDisabled || state.isDeleting,
            onSelect: state.onDeletePlan,
          },
        ],
      },
      breadcrumbs: [
        { label: "Meal plan", href: ROUTES.planCurrent },
        {
          label: planDateRangeLabel,
          select: { kind: "plan" as const, options: planOptions, currentId: planId },
        },
      ],
    }),
    [
      generateGroceryLabel,
      planDateRangeLabel,
      planId,
      planOptions,
      state.isDeleteDisabled,
      state.isDeleting,
      state.isEditDatesDisabled,
      state.isGenerateDisabled,
      state.isGenerating,
      state.isLoadingMeals,
      state.onDeletePlan,
      state.onEditDates,
      state.onGenerateGroceryList,
    ],
  );

  return <TopbarConfigController config={config} />;
}
