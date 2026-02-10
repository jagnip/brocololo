import { notFound } from "next/navigation";
import { getPlanById } from "@/lib/db/planner";
import { PlanView } from "@/components/planner/plan-view";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const plan = await getPlanById(planId);

  if (!plan) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <PlanView plan={plan} />
    </div>
  );
}
