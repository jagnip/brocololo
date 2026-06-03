import { getIngredients } from "@/lib/db/ingredients";
import { getRecipes } from "@/lib/db/recipes";
import {
  getOccupiedDateKeysForPlanning,
  getUnusedRecipesFromLatestPlan,
} from "@/lib/db/planner";
import { PlannerForm } from "./planner-form";
import { requireUser } from "@/lib/auth/session";
import { ensureSelfFamilyMember } from "@/lib/db/family-members";

export default async function PlannerFormContainer() {
  const { id: userId } = await requireUser();
  const [
    ingredients,
    recipes,
    previousPlanUnusedRecipes,
    occupiedDateKeys,
    familyMembers,
  ] =
    await Promise.all([
      getIngredients(userId),
      getRecipes(userId, undefined, undefined, false),
      getUnusedRecipesFromLatestPlan(userId),
      getOccupiedDateKeysForPlanning(userId),
      ensureSelfFamilyMember(userId),
    ]);

  return (
    <PlannerForm
      ingredients={ingredients}
      recipes={recipes}
      previousPlanUnusedRecipes={previousPlanUnusedRecipes}
      occupiedDateKeys={occupiedDateKeys}
      familyMembers={familyMembers}
    />
  );
}
