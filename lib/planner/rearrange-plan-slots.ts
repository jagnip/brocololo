import type { PlanInputType, SlotInputType } from "@/types/planner";
import { getPlanSlotKey } from "@/lib/planner/helpers";

/** Meal fields that travel with the meal (not date / mealType / id). */
type MovableMeal = Pick<
  SlotInputType,
  | "recipe"
  | "customMeal"
  | "alternatives"
  | "cookingFamilyMemberIds"
  | "used"
  | "batchGroupId"
>;

function isSlotEmpty(slot: SlotInputType): boolean {
  return !slot.recipe && !slot.customMeal;
}

function getMovableMeal(slot: SlotInputType): MovableMeal {
  return {
    recipe: slot.recipe,
    customMeal: slot.customMeal,
    alternatives: slot.alternatives,
    cookingFamilyMemberIds: slot.cookingFamilyMemberIds,
    used: slot.used,
    batchGroupId: slot.batchGroupId,
  };
}

/** Cleared empty slot keeps calendar identity (id / date / mealType). */
function clearMeal(slot: SlotInputType): SlotInputType {
  return {
    ...slot,
    recipe: null,
    customMeal: null,
    alternatives: [],
    cookingFamilyMemberIds: [],
    used: false,
    batchGroupId: null,
  };
}

function applyMeal(slot: SlotInputType, meal: MovableMeal): SlotInputType {
  return {
    ...slot,
    recipe: meal.recipe,
    customMeal: meal.customMeal,
    alternatives: meal.alternatives,
    cookingFamilyMemberIds: meal.cookingFamilyMemberIds,
    used: meal.used,
    batchGroupId: meal.batchGroupId ?? null,
  };
}

/**
 * Slot-to-slot rearrange for planner DnD:
 * - filled → empty: move (source clears)
 * - filled → filled: swap movable meal fields
 * Never expands multi-meal placements; only the two slots change.
 */
export function rearrangePlanSlots(
  plan: PlanInputType,
  sourceKey: string,
  targetKey: string,
): PlanInputType {
  if (sourceKey === targetKey) {
    return plan;
  }

  const sourceIndex = plan.findIndex(
    (slot) => getPlanSlotKey(slot) === sourceKey,
  );
  const targetIndex = plan.findIndex(
    (slot) => getPlanSlotKey(slot) === targetKey,
  );

  if (sourceIndex === -1 || targetIndex === -1) {
    return plan;
  }

  const source = plan[sourceIndex]!;
  const target = plan[targetIndex]!;

  // Empty sources are not draggable — treat as no-op.
  if (isSlotEmpty(source)) {
    return plan;
  }

  const sourceMeal = getMovableMeal(source);
  const next = [...plan];

  if (isSlotEmpty(target)) {
    // Move into empty slot.
    next[sourceIndex] = clearMeal(source);
    next[targetIndex] = applyMeal(target, sourceMeal);
    return next;
  }

  // Swap meals between two filled slots.
  const targetMeal = getMovableMeal(target);
  next[sourceIndex] = applyMeal(source, targetMeal);
  next[targetIndex] = applyMeal(target, sourceMeal);
  return next;
}
