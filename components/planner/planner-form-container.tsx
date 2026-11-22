import { getIngredients } from "@/lib/db/ingredients";
import { getRecipes } from "@/lib/db/recipes";
import {
  getOccupiedDateKeysForPlanning,
} from "@/lib/db/planner";
import { PlannerForm } from "./planner-form";
import { requireUser } from "@/lib/auth/session";
import { ensureSelfFamilyMember } from "@/lib/db/family-members";
import { listStoredMealLots } from "@/lib/db/storage";
import { listRollingMealQueue } from "@/lib/db/rolling-meals";
import type { RollingMealType } from "@/lib/validations/planner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function PlannerFormContainer() {
  const { id: userId } = await requireUser();
  const [
    ingredients,
    recipes,
    queue,
    occupiedDateKeys,
    familyMembers,
    storedMealLots,
  ] =
    await Promise.all([
      getIngredients(userId),
      getRecipes(userId, undefined, undefined, false),
      listRollingMealQueue(userId, { includeCurrent: true }).catch((error: unknown) => {
        if (error instanceof Error && (error.message === "ROLLING_MIGRATION_REQUIRED" || ("code" in error && error.code === "ROLLING_MIGRATION_REQUIRED"))) return null;
        throw error;
      }),
      getOccupiedDateKeysForPlanning(userId),
      ensureSelfFamilyMember(userId),
      listStoredMealLots(userId),
    ]);

  if (queue === null) return (
    <Alert>
      <AlertTitle>Rolling meals need migration</AlertTitle>
      <AlertDescription>Planning is paused until your existing meals have been reviewed and migrated. Contact support, then reload this page.</AlertDescription>
    </Alert>
  );

  const storedCounts = new Map<string, number>();
  for (const lot of storedMealLots) {
    if (lot.recipe.archivedAt || lot.recipe.excludeFromPlanner) continue;
    storedCounts.set(lot.recipe.id, (storedCounts.get(lot.recipe.id) ?? 0) + lot.count);
  }
  const previousPlanUnusedMeals: RollingMealType[] = queue.map((entry) => {
    const rollingQueueClaim = { id: entry.id, version: entry.version };
    if (entry.kind === "custom") return { kind: "custom", mealType: entry.mealType, customMeal: entry.customMeal, meals: entry.count, rollingQueueClaim: { ...rollingQueueClaim, mealType: entry.mealType } };
    return { kind: "recipe", recipeId: entry.recipeId, meals: entry.count + (storedCounts.get(entry.recipeId) ?? 0), rollingQueueClaim,
      source: { storedMeals: storedCounts.get(entry.recipeId) ?? 0, unfinishedScheduledMeals: entry.count } };
  });
  for (const [recipeId, count] of storedCounts) {
    if (queue.some((entry) => entry.kind === "recipe" && entry.recipeId === recipeId)) continue;
    previousPlanUnusedMeals.push({ kind: "recipe", recipeId, meals: count,
      source: { storedMeals: count, unfinishedScheduledMeals: 0 } });
  }

  return (
    <PlannerForm
      ingredients={ingredients}
      recipes={recipes}
      previousPlanUnusedMeals={previousPlanUnusedMeals}
      occupiedDateKeys={occupiedDateKeys}
      familyMembers={familyMembers}
      storedMealLots={storedMealLots}
    />
  );
}
