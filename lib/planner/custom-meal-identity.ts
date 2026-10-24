import type { PlanCustomMeal } from "@/types/planner";

/** Stable identity for custom meal content; ingredient entry order is not meaningful. */
export function getCustomMealContentKey(customMeal: PlanCustomMeal): string {
  const ingredients = customMeal.ingredients
    .map(({ ingredientId, unitId, amount }) => [ingredientId, unitId, amount] as const)
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));

  return JSON.stringify([
    customMeal.name.trim().toLocaleLowerCase(),
    ingredients,
  ]);
}

/** Rolling custom meals remain constrained to their original meal occasion. */
export function getRollingCustomMealKey(
  mealType: "BREAKFAST" | "LUNCH" | "DINNER",
  customMeal: PlanCustomMeal,
): string {
  return `${mealType}:${getCustomMealContentKey(customMeal)}`;
}
