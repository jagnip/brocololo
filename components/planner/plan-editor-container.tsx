import { notFound } from "next/navigation";
import { getPlanById } from "@/lib/db/planner";
import { getRecipes } from "@/lib/db/recipes";
import { getIngredients } from "@/lib/db/ingredients";
import { PlanEditor } from "./plan-editor";
import { requireUser } from "@/lib/auth/session";
import { ingredientsToLogIngredientOptions } from "@/lib/ingredients/to-log-ingredient-options";

type PlanEditorContainerProps = {
  planId: string;
};

export async function PlanEditorContainer({ planId }: PlanEditorContainerProps) {
  const { id: userId } = await requireUser();
  const [plan, recipes, ingredients] = await Promise.all([
    getPlanById(userId, planId),
    getRecipes(userId, undefined, undefined, false),
    getIngredients(userId),
  ]);

  if (!plan) {
    notFound();
  }

  return (
    <PlanEditor
      planId={planId}
      initialPlan={plan}
      recipes={recipes}
      ingredientOptions={ingredientsToLogIngredientOptions(ingredients)}
    />
  );
}
