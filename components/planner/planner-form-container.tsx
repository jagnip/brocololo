import { getIngredients } from "@/lib/db/ingredients";
import { getRecipes } from "@/lib/db/recipes";
import {
  getOccupiedDateKeysForPlanning,
  getUnusedRecipesFromLatestPlan,
} from "@/lib/db/planner";
import { PlannerForm } from "./planner-form";

export default async function PlannerFormContainer() {
  const [ingredients, recipes, previousPlanUnusedRecipes, occupiedDateKeys] =
    await Promise.all([
    getIngredients(),
    // Planner loads all planner-eligible recipes; slot filtering happens by meal occasion.
    getRecipes(undefined, undefined, false),
    getUnusedRecipesFromLatestPlan(),
    getOccupiedDateKeysForPlanning(),
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
