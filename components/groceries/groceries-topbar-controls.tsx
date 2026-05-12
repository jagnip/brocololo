"use client";

import {
  GroceriesPlanSelect,
  type GroceriesPlanSelectOption,
} from "@/components/groceries/groceries-plan-select";

type GroceriesTopbarControlsProps = {
  planOptions: GroceriesPlanSelectOption[];
  planId: string;
};

/** Top bar controls for groceries: plan switcher (same optimistic pattern as planner). */
export function GroceriesTopbarControls({
  planOptions,
  planId,
}: GroceriesTopbarControlsProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <GroceriesPlanSelect plans={planOptions} currentPlanId={planId} />
    </div>
  );
}
