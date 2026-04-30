import { PlannerMealType } from "@/src/generated/enums";
import { RecipeType } from "@/types/recipe";

export function filterByMealOccasion(
  recipes: RecipeType[],
  mealType: PlannerMealType,
): RecipeType[] {
  const requiredOccasion = mealType.toLowerCase();
  return recipes.filter((recipe) =>
    recipe.categories.some(
      (cat) => cat.type === "MEAL_OCCASION" && cat.slug === requiredOccasion
    )
  );
}

export function filterExcluded(recipes: RecipeType[]): RecipeType[] {
  return recipes.filter((recipe) => !recipe.excludeFromPlanner);
}

export function filterByHandsOnTime(
  recipes: RecipeType[],
  maxHandsOnTime: number | null
): RecipeType[] {
  if (maxHandsOnTime === null) return recipes;
  return recipes.filter((recipe) => recipe.handsOnTime <= maxHandsOnTime);
}

export function filterByTotalTime(
  recipes: RecipeType[],
  maxTotalTime: number | null
): RecipeType[] {
  if (maxTotalTime === null) return recipes;
  return recipes.filter((recipe) => recipe.totalTime <= maxTotalTime);
}