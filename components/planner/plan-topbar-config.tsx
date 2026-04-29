"use client";

import { useMemo } from "react";
import { PlanTopbarControls } from "@/components/planner/plan-topbar-controls";
import type { PlanSelectOption } from "@/components/planner/plan-select";
import { TopbarConfigController } from "@/components/topbar-config";
import { ROUTES } from "@/lib/constants";

type PlanTopbarConfigProps = {
  planOptions: PlanSelectOption[];
  planId: string;
};

/** Registers plan detail top bar: plan switcher + New plan (mirrors previous `PlanPageHeader` actions). */
export function PlanTopbarConfig({ planOptions, planId }: PlanTopbarConfigProps) {
  const config = useMemo(
    () => ({
      rightContent: (
        <PlanTopbarControls planOptions={planOptions} planId={planId} />
      ),
      actions: [
        {
          id: "new-plan",
          label: "Create plan",
          href: ROUTES.planCreate,
          variant: "default" as const,
          size: "default" as const,
          ariaLabel: "Create plan",
        },
      ],
    }),
    [planId, planOptions],
  );

  return <TopbarConfigController config={config} />;
}
