import { getIngredients } from "@/lib/db/ingredients";
import { getRecipes } from "@/lib/db/recipes";
import { getUnusedRecipesFromLatestPlan } from "@/lib/db/planner";
import { PlannerForm } from "./planner-form";

export default async function PlannerFormContainer() {
  const [ingredients, recipes, previousPlanUnusedRecipes] = await Promise.all([
    getIngredients(),
    // No flavour filter in planner context; include only planner-eligible recipes.
    getRecipes(undefined, undefined, false),
    getUnusedRecipesFromLatestPlan(),
  ]);

  return (
    <PlannerForm
      ingredients={ingredients}
      recipes={recipes}
      previousPlanUnusedRecipes={previousPlanUnusedRecipes}
    />
  );
}
