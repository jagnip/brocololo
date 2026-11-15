import type { StoredMealLotRow } from "@/lib/db/storage";
import type { PlanInputType } from "@/types/planner";
import { allocateStoredMeals } from "./allocate-stored-meals";

/** Project storage transfers for display only; the original plan remains the save payload. */
export function previewStoredMeals(
  plan: PlanInputType,
  lots: readonly StoredMealLotRow[],
): PlanInputType {
  const result = [...plan];
  const recipeIds = new Set(plan.flatMap((slot) =>
    slot.recipe && slot.placementId && !slot.used ? [slot.recipe.id] : [],
  ));

  for (const recipeId of recipeIds) {
    const indices = plan.flatMap((slot, index) =>
      slot.recipe?.id === recipeId && slot.placementId && !slot.used ? [index] : [],
    );
    const allocations = allocateStoredMeals(
      lots.filter((lot) => lot.recipe.id === recipeId).map((lot) => ({
        id: lot.id,
        count: lot.count,
        cookedAt: lot.cookedAt,
        cookingFamilyMemberIds: lot.audience.map((member) => member.id),
      })),
      indices.map((index) => ({
        cookingFamilyMemberIds: plan[index].cookingFamilyMemberIds ?? [],
      })),
    );
    allocations.forEach((lotId, index) => {
      if (lotId) {
        const slotIndex = indices[index];
        result[slotIndex] = { ...plan[slotIndex], alreadyCooked: true, batchGroupId: null };
      }
    });
  }
  return result;
}
