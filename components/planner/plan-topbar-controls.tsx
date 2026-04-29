"use client";

import { PlanSelect, type PlanSelectOption } from "@/components/planner/plan-select";
import { Label } from "@/components/ui/label";

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
    <div className="flex min-w-0 items-center gap-2">
      <Label className="shrink-0 text-xs text-muted-foreground">Plan</Label>
      <PlanSelect plans={planOptions} currentPlanId={planId} />
    </div>
  );
}
