"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/lib/constants";

export type PlanSelectOption = {
  id: string;
  label: string;
};

type PlanSelectProps = {
  plans: PlanSelectOption[];
  currentPlanId: string;
};

export function PlanSelect({ plans, currentPlanId }: PlanSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleValueChange = (nextPlanId: string) => {
    if (nextPlanId === currentPlanId) return;

    // Preserve existing query params (e.g. day/person-like filters) while switching plan id.
    const params = new URLSearchParams(searchParams.toString());
    const query = params.toString();
    const nextPath = ROUTES.planView(nextPlanId);
    router.push(query ? `${nextPath}?${query}` : nextPath);
  };

  return (
    <Select value={currentPlanId} onValueChange={handleValueChange} allowInlineClear={false}>
      <SelectTrigger className="w-full min-w-48 max-w-md">
        <SelectValue placeholder="Select a plan" />
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
