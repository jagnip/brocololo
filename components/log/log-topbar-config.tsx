"use client";

import { useMemo } from "react";
import { TopbarConfigController } from "@/components/topbar-config";
import { ROUTES } from "@/lib/constants";

type LogTopbarConfigProps = {
  planId: string;
};

/** Registers log detail top bar actions (e.g. link back to the plan this log belongs to). */
export function LogTopbarConfig({ planId }: LogTopbarConfigProps) {
  const config = useMemo(
    () => ({
      actions: [
        {
          id: "view-plan",
          label: "View plan",
          href: ROUTES.planView(planId),
          variant: "outline" as const,
          size: "sm" as const,
        },
      ],
    }),
    [planId],
  );

  return <TopbarConfigController config={config} />;
}
