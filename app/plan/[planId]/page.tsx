import { notFound } from "next/navigation";
import { getPlanById } from "@/lib/db/planner";
import { getRecipes } from "@/lib/db/recipes";
import { PlanEditor } from "@/components/planner/plan-editor";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const [plan, recipes] = await Promise.all([
    getPlanById(planId),
    getRecipes([], undefined, false),
  ]);

  if (!plan) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <PlanEditor planId={planId} initialPlan={plan} recipes={recipes} />
    </div>
  );
}
