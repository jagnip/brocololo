"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/lib/constants";

export type GroceriesPlanSelectOption = {
  id: string;
  label: string;
};

type GroceriesPlanSelectProps = {
  plans: GroceriesPlanSelectOption[];
  currentPlanId: string;
};

/** Plan switcher for groceries routes — optimistic UI + navigation (same pattern as `PlanSelect`). */
export function GroceriesPlanSelect({ plans, currentPlanId }: GroceriesPlanSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [optimisticPlanId, setOptimisticPlanId] = useOptimistic(currentPlanId);

  // Stay on edit vs view when switching plans (mirrors preserving route “shape” elsewhere).
  const isEditRoute = pathname.endsWith("/edit");

  const handleValueChange = (nextPlanId: string) => {
    if (nextPlanId === optimisticPlanId) return;
    setOptimisticPlanId(nextPlanId);

    const params = new URLSearchParams(searchParams.toString());
    const query = params.toString();
    const nextPath = isEditRoute
      ? ROUTES.groceriesEdit(nextPlanId)
      : ROUTES.groceriesView(nextPlanId);
    startTransition(() => {
      router.push(query ? `${nextPath}?${query}` : nextPath);
    });
  };

  return (
    <Select value={optimisticPlanId} onValueChange={handleValueChange} allowInlineClear={false}>
      <SelectTrigger className="w-36 min-w-0 max-w-[45vw] sm:w-full sm:min-w-48 sm:max-w-md">
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
