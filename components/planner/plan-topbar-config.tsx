"use client";

import { useMemo } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { PlanTopbarControls } from "@/components/planner/plan-topbar-controls";
import type { PlanSelectOption } from "@/components/planner/plan-select";
import { TopbarConfigController } from "@/components/topbar-config";
import { usePlanTopbarState } from "@/components/planner/plan-topbar-state-context";
import { ROUTES } from "@/lib/constants";

type PlanTopbarConfigProps = {
  planOptions: PlanSelectOption[];
  planId: string;
};

/** Registers plan detail top bar: plan switcher + New plan (mirrors previous `PlanPageHeader` actions). */
export function PlanTopbarConfig({ planOptions, planId }: PlanTopbarConfigProps) {
  const { state } = usePlanTopbarState();

  const config = useMemo(
    () => ({
      rightContent: (
        <PlanTopbarControls planOptions={planOptions} planId={planId} />
      ),
      actions: [
        {
          id: "new-plan",
          label: "New plan",
          href: ROUTES.planCreate,
          icon: <Plus className="h-4 w-4" />,
          variant: "outline" as const,
          size: "icon" as const,
          ariaLabel: "New plan",
        },
        {
          id: "delete-plan",
          label: "Delete plan",
          onClick: state.onDeletePlan,
          disabled: state.isDeleteDisabled,
          ariaBusy: state.isDeleting,
          icon: state.isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          ),
          variant: "outline" as const,
          size: "icon" as const,
          ariaLabel: "Delete plan",
        },
      ],
    }),
    [planId, planOptions, state],
  );

  return <TopbarConfigController config={config} />;
}
