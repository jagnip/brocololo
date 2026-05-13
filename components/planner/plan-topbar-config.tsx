"use client";

import { TopbarConfigController } from "@/components/topbar-config";
import { ROUTES } from "@/lib/constants";
import type { TopbarActionConfig } from "@/components/context/topbar-context";

export const PLAN_TOPBAR_ACTIONS: TopbarActionConfig[] = [
  {
    id: "new-plan",
    label: "Create plan",
    href: ROUTES.planCreate,
    variant: "outline",
    size: "default",
    ariaLabel: "Create plan",
  },
];

const planTopbarConfig = {
  actions: PLAN_TOPBAR_ACTIONS,
};

/** Registers plan detail top bar actions only (selector lives in page content). */
export function PlanTopbarConfig() {
  return <TopbarConfigController config={planTopbarConfig} />;
}
