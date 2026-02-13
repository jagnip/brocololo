import { getIngredients } from "@/lib/db/ingredients";
import { getRecipes } from "@/lib/db/recipes";
import { PlannerForm } from "./planner-form";

export default async function PlannerFormContainer() {
  const ingredients = await getIngredients();
  const recipes = await getRecipes([], undefined, false);

  return <PlannerForm ingredients={ingredients} recipes={recipes} />;
}
