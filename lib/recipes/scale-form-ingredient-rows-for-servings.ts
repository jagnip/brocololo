import { calculateServingScalingFactor } from "@/lib/recipes/helpers";
import type { CreateRecipeFormValues } from "@/lib/validations/recipe";

type Row = CreateRecipeFormValues["ingredients"][number];

/**
 * Scale quantified ingredient rows when portions (servings) change.
 * Uses the same linear ratio as the recipe view page (`servingScalingFactor` from
 * `calculateServingScalingFactor`); Nelson multiplier does not affect batch totals.
 */
export function scaleFormIngredientRowsForNewServings(
  rows: Row[],
  nextServings: number,
  amountsBaselineServings: number,
): Row[] {
  if (
    !Number.isFinite(nextServings) ||
    nextServings <= 0 ||
    !Number.isFinite(amountsBaselineServings) ||
    amountsBaselineServings <= 0
  ) {
    return rows;
  }

  const { servingScalingFactor } = calculateServingScalingFactor(
    nextServings,
    amountsBaselineServings,
    1,
  );

  if (!Number.isFinite(servingScalingFactor) || servingScalingFactor === 1) {
    return rows;
  }

  return rows.map((row) =>
    row.amount == null
      ? row
      : {
          ...row,
          // Tidy float noise after proportional scale (editor allows decimals).
          amount: Number((row.amount * servingScalingFactor).toFixed(6)),
        },
  );
}
