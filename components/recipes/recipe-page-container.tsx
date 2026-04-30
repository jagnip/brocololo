import { notFound } from "next/navigation";
import { getRecipeBySlug } from "@/lib/db/recipes";
import { getIngredients } from "@/lib/db/ingredients";
import { getLogs } from "@/lib/db/logs";
import RecipePage from "./recipe-page";
import { getIngredientFormDependencies } from "@/components/ingredients/form/form-dependencies";
import { RecipePageProvider } from "@/components/context/recipe-page-context";

type RecipePageContainerProps = {
  recipeSlug: string;
};

export default async function RecipePageContainer({
  recipeSlug,
}: RecipePageContainerProps) {
  const [recipe, ingredients, ingredientFormDependencies, logs] = await Promise.all([
    getRecipeBySlug(recipeSlug),
    getIngredients(),
    getIngredientFormDependencies(),
    getLogs(),
  ]);

  if (!recipe) {
    notFound();
  }

  const logDateKeys = getLogDateKeys(logs);

  return (
    <RecipePageProvider
      recipe={recipe}
      ingredients={ingredients}
      availableLogDateKeys={logDateKeys}
    >
      <RecipePage ingredientFormDependencies={ingredientFormDependencies} />
    </RecipePageProvider>
  );
}

function getLogDateKeys(
  logs: Awaited<ReturnType<typeof getLogs>>,
): string[] {
  const dateKeys = new Set<string>();

  for (const log of logs) {
    // Expand each generated log range so the picker can enforce date-level availability.
    const current = new Date(log.plan.startDate);
    const end = new Date(log.plan.endDate);
    while (current <= end) {
      dateKeys.add(current.toISOString().slice(0, 10));
      current.setUTCDate(current.getUTCDate() + 1);
    }
  }

  return Array.from(dateKeys).sort((a, b) => a.localeCompare(b));
}
