"use client";

import { PlanSwitcherSelect } from "@/components/planner/plan-switcher-select";
import type { PlanNavigationKind } from "@/components/planner/use-plan-navigation";
import type { PlanSwitcherOption } from "@/lib/planner/plan-switcher-options";

export type BreadcrumbSelectOption = PlanSwitcherOption;

export type BreadcrumbSelectConfig = {
  kind: PlanNavigationKind;
  options: BreadcrumbSelectOption[];
  currentId: string;
};

type BreadcrumbSelectProps = {
  label: string;
  select: BreadcrumbSelectConfig;
};

/** Breadcrumb-styled plan switcher — thin wrapper over `PlanSwitcherSelect`. */
export function BreadcrumbSelect({ label, select }: BreadcrumbSelectProps) {
  const { kind, options, currentId } = select;

  return (
    <PlanSwitcherSelect
      variant="breadcrumb"
      label={label}
      options={options}
      currentId={currentId}
      kind={kind}
      ariaLabel={
        kind === "groceries" ? "Switch groceries list" : "Switch meal plan"
      }
    />
  );
}
