"use client";

import { useMemo } from "react";
import { TopbarConfigController } from "@/components/topbar-config";
import { ROUTES } from "@/lib/constants";

type GroceriesViewTopbarConfigProps = {
  planId: string;
};

export function GroceriesViewTopbarConfig({
  planId,
}: GroceriesViewTopbarConfigProps) {
  const config = useMemo(
    () => ({
      actions: [
        {
          id: "edit-groceries",
          label: "Edit groceries",
          href: ROUTES.groceriesEdit(planId),
          variant: "outline" as const,
          size: "sm" as const,
        },
      ],
    }),
    [planId],
  );

  return <TopbarConfigController config={config} />;
}
