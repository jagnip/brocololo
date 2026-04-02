"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { LogTopbarControls } from "@/components/log/log-topbar-controls";
import type { LogSelectOption } from "@/components/log/log-select";
import { TopbarConfigController } from "@/components/topbar-config";
import { ROUTES } from "@/lib/constants";

type LogTopbarConfigProps = {
  planId: string;
  logOptions: LogSelectOption[];
  logId: string;
};

/** Registers log detail top bar actions (e.g. link back to the plan this log belongs to). */
export function LogTopbarConfig({ planId, logOptions, logId }: LogTopbarConfigProps) {
  const config = useMemo(
    () => ({
      rightContent: <LogTopbarControls logOptions={logOptions} logId={logId} />,
      actions: [
        {
          id: "view-plan",
          label: "View plan",
          href: ROUTES.planView(planId),
          icon: <CalendarDays className="h-4 w-4" />,
          variant: "outline" as const,
          size: "icon" as const,
          ariaLabel: "View plan",
        },
      ],
    }),
    [planId, logId, logOptions],
  );

  return <TopbarConfigController config={config} />;
}
