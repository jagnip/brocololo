import { getDefaultModifyAmountForMember } from "@/lib/recipes/ingredient-adjustments";
import type { MemberPortionInput } from "@/lib/recipes/ingredient-adjustments";
import type { CreateRecipeFormValues } from "@/lib/validations/recipe";

type FormIngredientRow = CreateRecipeFormValues["ingredients"][number];

/**
 * Recompute MODIFY adjustment amounts so they match current portion multipliers
 * (batch ÷ servings × multiplier per person).
 */
export function syncModifyAmountsToPortionMultipliers(
  ingredients: FormIngredientRow[],
  memberPortions: MemberPortionInput[],
  servings: number,
): FormIngredientRow[] {
  if (
    !Number.isFinite(servings) ||
    servings <= 0 ||
    memberPortions.length === 0
  ) {
    return ingredients;
  }

  return ingredients.map((row) => {
    if (row.amount == null || row.amount <= 0 || !row.ingredientId) {
      return row;
    }

    const memberAdjustments = (row.memberAdjustments ?? []).map((adjustment) => {
      if (adjustment.kind !== "MODIFY") {
        return adjustment;
      }

      const nextAmount = getDefaultModifyAmountForMember({
        batchAmount: row.amount!,
        servings,
        familyMemberId: adjustment.familyMemberId,
        memberPortions,
      });

      if (nextAmount == null) {
        return adjustment;
      }

      return {
        ...adjustment,
        amount: nextAmount,
      };
    });

    return {
      ...row,
      memberAdjustments,
    };
  });
}
