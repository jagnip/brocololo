"use client";

import { TopbarConfigController } from "@/components/topbar-config";
import { ROUTES } from "@/lib/constants";

const planTopbarConfig = {
  actions: [
    {
      id: "new-plan",
      label: "Create plan",
      href: ROUTES.planCreate,
      variant: "outline" as const,
      size: "default" as const,
      ariaLabel: "Create plan",
    },
  ],
};

/** Registers plan detail top bar actions only (selector lives in page content). */
export function PlanTopbarConfig() {
  return <TopbarConfigController config={planTopbarConfig} />;
}
