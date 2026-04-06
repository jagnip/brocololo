"use client";

import { PlanSelect, type PlanSelectOption } from "@/components/planner/plan-select";

type PlanTopbarControlsProps = {
  planOptions: PlanSelectOption[];
  planId: string;
};

/** Top bar controls for plan detail: plan switcher (same `PlanSelect` as the former in-page header). */
export function PlanTopbarControls({
  planOptions,
  planId,
}: PlanTopbarControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <PlanSelect plans={planOptions} currentPlanId={planId} />
    </div>
  );
}
