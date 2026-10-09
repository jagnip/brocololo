"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { ROUTES } from "@/lib/constants";

export type PlanNavigationKind = "plan" | "groceries" | "log";

type UsePlanNavigationParams = {
  currentPlanId: string;
  kind: PlanNavigationKind;
};

function getPlanPath(nextPlanId: string, kind: PlanNavigationKind) {
  switch (kind) {
    case "plan":
      return ROUTES.planView(nextPlanId);
    case "log":
      return ROUTES.logPlanView(nextPlanId);
    case "groceries":
      // Groceries switcher is view-only; edit route never mounts the switcher.
      return ROUTES.groceriesView(nextPlanId);
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

    // Preserve person filters without allowing a legacy tab to change destinations.
    const params = new URLSearchParams(searchParams.toString());
    if (kind !== "groceries") params.delete("tab");
    if (kind === "log") {
      // A day from another plan may be outside the next plan's range.
      params.delete("day");
    }
    const query = params.toString();
    const nextPath = getPlanPath(nextPlanId, kind);

    // Optimistic update must run inside the same transition as navigation, otherwise
    // React briefly reverts to the previous plan id (visible blink in the breadcrumb).
    startTransition(() => {
      setOptimisticPlanId(nextPlanId);
      router.push(query ? `${nextPath}?${query}` : nextPath);
    });
  };

  return { optimisticId: optimisticPlanId, handleValueChange };
}
