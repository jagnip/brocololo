import { notFound } from "next/navigation";
import { getSavedPlanEditorData } from "@/lib/db/saved-plan-editor";
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
  const [savedPlan, recipes, ingredients, familyMembers] = await Promise.all([
    getSavedPlanEditorData(userId, planId),
    getRecipes(userId, undefined, undefined, false),
    getIngredients(userId),
    listFamilyMembers(userId),
  ]);

  if (!savedPlan) {
    notFound();
  }

  return (
    <PlanEditor
      planId={planId}
      initialPlan={savedPlan.slots}
      initialBatches={savedPlan.batches}
      initialVersion={savedPlan.version}
      recipes={recipes}
      ingredientOptions={ingredientsToLogIngredientOptions(ingredients)}
      familyMembers={familyMembers}
    />
  );
}
