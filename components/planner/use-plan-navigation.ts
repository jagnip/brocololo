"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { ROUTES } from "@/lib/constants";

export type PlanNavigationKind = "plan";

type UsePlanNavigationParams = {
  currentPlanId: string;
  kind: PlanNavigationKind;
};

function getPlanPath(nextPlanId: string, kind: PlanNavigationKind) {
  switch (kind) {
    case "plan":
      return ROUTES.planView(nextPlanId);
  }
}

/** Shared optimistic navigation when switching plans (breadcrumb or in-page select). */
export function usePlanNavigation({
  currentPlanId,
  kind,
}: UsePlanNavigationParams) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [optimisticPlanId, setOptimisticPlanId] = useOptimistic(currentPlanId);

  const handleValueChange = (nextPlanId: string) => {
    if (nextPlanId === optimisticPlanId) return;
    setOptimisticPlanId(nextPlanId);

    // Preserve existing query params (e.g. tab=log, person filters) while switching plan id.
    const params = new URLSearchParams(searchParams.toString());
    const query = params.toString();
    const nextPath = getPlanPath(nextPlanId, kind);

    startTransition(() => {
      router.push(query ? `${nextPath}?${query}` : nextPath);
    });
  };

  return { optimisticId: optimisticPlanId, handleValueChange };
}
