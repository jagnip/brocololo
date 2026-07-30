import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getRecipeBySlug } from "@/lib/db/recipes";
import { getIngredients } from "@/lib/db/ingredients";
import { mergeRecipeIngredientGroceries } from "@/lib/ingredients/merge-recipe-ingredient-groceries";
import { getLogs } from "@/lib/db/logs";
import RecipePage from "./recipe-page";
import { getIngredientFormDependencies } from "@/components/ingredients/form/form-dependencies";
import { RecipePageCookSessionBridge } from "@/components/recipes/recipe-page-cook-session-bridge";
import { requireUser } from "@/lib/auth/session";
import { ensureSelfFamilyMember } from "@/lib/db/family-members";

type RecipePageContainerProps = {
  recipeSlug: string;
  /** Encoded planner cook hand-off from `?cook=`. */
  cookParam?: string;
};

export default async function RecipePageContainer({
  recipeSlug,
  cookParam,
}: RecipePageContainerProps) {
  const { id: userId } = await requireUser();
  const [recipe, ingredients, ingredientFormDependencies, logs, familyMembers] = await Promise.all([
    getRecipeBySlug(userId, recipeSlug),
    getIngredients(userId),
    getIngredientFormDependencies(),
    getLogs(userId),
    ensureSelfFamilyMember(userId),
  ]);

  if (!recipe) {
    notFound();
  }

  const logDateKeys = getLogDateKeys(logs);
  // Nested recipe ingredients omit overlay merge; reuse resolved catalog URLs.
  const resolvedRecipe = mergeRecipeIngredientGroceries(recipe, ingredients);

  return (
    // useSearchParams in the bridge needs a Suspense boundary in the App Router.
    <Suspense
      fallback={
        <RecipePageCookSessionBridge
          recipe={resolvedRecipe}
          ingredients={ingredients}
          familyMembers={familyMembers}
          availableLogDateKeys={logDateKeys}
          initialCookParam={cookParam}
        >
          <RecipePage ingredientFormDependencies={ingredientFormDependencies} />
        </RecipePageCookSessionBridge>
      }
    >
      <RecipePageCookSessionBridge
        recipe={resolvedRecipe}
        ingredients={ingredients}
        familyMembers={familyMembers}
        availableLogDateKeys={logDateKeys}
        initialCookParam={cookParam}
      >
        <RecipePage ingredientFormDependencies={ingredientFormDependencies} />
      </RecipePageCookSessionBridge>
    </Suspense>
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
