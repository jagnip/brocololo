import { getIngredients } from "@/lib/db/ingredients";
import { PlannerForm } from "./planner-form";

export default async function PlannerFormContainer() {
  const ingredients = await getIngredients();

  return <PlannerForm ingredients={ingredients} />;
}
