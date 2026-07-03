import { notFound } from "next/navigation";
import { getPlanById } from "@/lib/db/planner";
import { getRecipes } from "@/lib/db/recipes";
import { getIngredients } from "@/lib/db/ingredients";
import { PlanEditor } from "./plan-editor";
import { requireUser } from "@/lib/auth/session";
import { listFamilyMembers } from "@/lib/db/family-members";
import { ingredientsToLogIngredientOptions } from "@/lib/ingredients/to-log-ingredient-options";

type PlanEditorContainerProps = {
  planId: string;
};

export async function PlanEditorContainer({ planId }: PlanEditorContainerProps) {
  const { id: userId } = await requireUser();
  const [plan, recipes, ingredients, familyMembers] = await Promise.all([
    getPlanById(userId, planId),
    getRecipes(userId, undefined, undefined, false),
    getIngredients(userId),
    listFamilyMembers(userId),
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
      familyMembers={familyMembers}
    />
  );
}
