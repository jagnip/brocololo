import { MealType } from "@/src/generated/enums";
import { RecipeType } from "@/types/recipe";

export function filterByFlavour(recipes: RecipeType[], mealType: MealType): RecipeType[] {
  const requiredFlavour = mealType === MealType.BREAKFAST ? "sweet" : "savoury";
  return recipes.filter((recipe) =>
    recipe.categories.some(
      (cat) => cat.type === "FLAVOUR" && cat.slug === requiredFlavour
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