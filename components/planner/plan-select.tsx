"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePlanNavigation } from "@/components/planner/use-plan-navigation";

export type PlanSelectOption = {
  id: string;
  label: string;
};

type PlanSelectProps = {
  plans: PlanSelectOption[];
  currentPlanId: string;
};

export function PlanSelect({ plans, currentPlanId }: PlanSelectProps) {
  const { optimisticId, handleValueChange } = usePlanNavigation({
    currentPlanId,
    kind: "plan",
  });

  return (
    <Select value={optimisticId} onValueChange={handleValueChange} allowInlineClear={false}>
      {/* On tight viewports allow the trigger to shrink; keep larger minimum from `sm` up. */}
      <SelectTrigger className="w-36 min-w-0 max-w-[45vw] sm:w-full sm:min-w-48 sm:max-w-md">
        {/* Explicit truncate helps long date ranges stay readable in constrained topbars. */}
        <SelectValue className="truncate" placeholder="Select a plan" />
      </SelectTrigger>
      <SelectContent>
        {plans.map((plan) => (
          <SelectItem key={plan.id} value={plan.id}>
            {plan.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
