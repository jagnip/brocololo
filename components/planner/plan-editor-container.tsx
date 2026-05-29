import { notFound } from "next/navigation";
import { getPlanById } from "@/lib/db/planner";
import { getRecipes } from "@/lib/db/recipes";
import { PlanEditor } from "./plan-editor";
import { requireUser } from "@/lib/auth/session";

type PlanEditorContainerProps = {
  planId: string;
};

export async function PlanEditorContainer({ planId }: PlanEditorContainerProps) {
  const { id: userId } = await requireUser();
  const [plan, recipes] = await Promise.all([
    getPlanById(userId, planId),
    getRecipes(userId, undefined, undefined, false),
  ]);

  if (!plan) {
    notFound();
  }

  return <PlanEditor planId={planId} initialPlan={plan} recipes={recipes} />;
}
