import { getIngredients } from "@/lib/db/ingredients";
import { getRecipes } from "@/lib/db/recipes";
import {
  getOccupiedDateKeysForPlanning,
  getUnusedRecipesFromLatestPlan,
} from "@/lib/db/planner";
import { PlannerForm } from "./planner-form";
import { requireUser } from "@/lib/auth/session";

export default async function PlannerFormContainer() {
  const { id: userId } = await requireUser();
  const [ingredients, recipes, previousPlanUnusedRecipes, occupiedDateKeys] =
    await Promise.all([
    getIngredients(userId),
    getRecipes(userId, undefined, undefined, false),
    getUnusedRecipesFromLatestPlan(userId),
    getOccupiedDateKeysForPlanning(userId),
  ]);

  return (
    <PlannerForm
      ingredients={ingredients}
      recipes={recipes}
      previousPlanUnusedRecipes={previousPlanUnusedRecipes}
      occupiedDateKeys={occupiedDateKeys}
    />
  );
}
