import type { ReactNode } from "react";
import { PlanTopbar } from "@/components/planner/plan-topbar";
import { PlanTopbarStateProvider } from "@/components/planner/plan-topbar-state-context";

export default async function PlanDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  return (
    <PlanTopbarStateProvider>
      <PlanTopbar planId={planId} />
      {children}
    </PlanTopbarStateProvider>
  );
}
