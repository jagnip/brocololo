import type { NutritionTarget } from "@/src/generated/enums";

type PersonRole = "primary" | "secondary";

export function getPersonIngredientAmountPerMeal(params: {
  amount: number | null;
  nutritionTarget: NutritionTarget;
  person: PersonRole;
  recipeServings: number;
  servingMultiplierForNelson: number;
}): number | null {
  const {
    amount,
    nutritionTarget,
    person,
    recipeServings,
    servingMultiplierForNelson,
  } = params;

  if (amount == null) return null;

  // Convert recipe-level saved amount into one-meal baseline first.
  const mealCount = recipeServings / 2;
  if (!Number.isFinite(mealCount) || mealCount <= 0) return null;
  const perMealAmount = amount / mealCount;

  // Person-specific rows are saved only in that person's log entry.
  if (nutritionTarget === "PRIMARY_ONLY") {
    return person === "primary" ? perMealAmount : null;
  }
  if (nutritionTarget === "SECONDARY_ONLY") {
    return person === "secondary" ? perMealAmount : null;
  }

  // BOTH rows are split by the 1 : multiplier ratio.
  const totalParts = 1 + servingMultiplierForNelson;
  if (!Number.isFinite(totalParts) || totalParts <= 0) return null;
  const factor =
    person === "primary" ? 1 / totalParts : servingMultiplierForNelson / totalParts;

  return perMealAmount * factor;
}
