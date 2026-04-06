import type { ReactNode } from "react";
import { PlanTopbar } from "@/components/planner/plan-topbar";

export default async function PlanDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  return (
    <>
      <PlanTopbar planId={planId} />
      {children}
    </>
  );
}
