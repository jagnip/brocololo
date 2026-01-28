import { notFound } from "next/navigation";
import { getPlanById } from "@/lib/db/planner";
import { getRecipes } from "@/lib/db/recipes";
import { PlanEditor } from "./plan-editor";

type PlanEditorContainerProps = {
  planId: string;
};

export async function PlanEditorContainer({ planId }: PlanEditorContainerProps) {
  // Keep page.tsx thin by loading data in the container.
  const [plan, recipes] = await Promise.all([
    getPlanById(planId),
    getRecipes([], undefined, false),
  ]);

  if (!plan) {
    notFound();
  }

  return <PlanEditor planId={planId} initialPlan={plan} recipes={recipes} />;
}
