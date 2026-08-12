import { getOrderedPlanSlots } from "@/lib/planner/helpers";
import { encodePlanCookParam } from "@/lib/recipes/plan-cook-session-link";
import type { CookingCombination } from "@/lib/recipes/cook-session-portions";
import { ROUTES } from "@/lib/constants";
import type { PlanInputType, SlotInputType } from "@/types/planner";

/** All slots (chronological) sharing this batch group AND this exact recipe. */
export function getBatchGroupSlotsForRecipe(
  plan: PlanInputType,
  batchGroupId: string,
  recipeId: string,
): SlotInputType[] {
  return getOrderedPlanSlots(plan).filter(
    (slot) =>
      slot.batchGroupId === batchGroupId && slot.recipe?.id === recipeId,
  );
}

/** True when two id lists contain the same set of members (order-independent). */
function sameAudience(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  if (setA.size !== a.length) {
    const setB = new Set(b);
    if (setA.size !== setB.size) return false;
    for (const id of setA) {
      if (!setB.has(id)) return false;
    }
    return true;
  }
  for (const id of b) {
    if (!setA.has(id)) return false;
  }
  return true;
}

/**
 * Same fallback as PlannerSlotCard: empty/missing eaters → household.
 * Keeps the recipe-page hand-off aligned with what the plan card shows.
 */
export function resolveSlotAudienceIds(
  slot: Pick<SlotInputType, "cookingFamilyMemberIds">,
  fallbackMemberIds: string[],
): string[] {
  if (slot.cookingFamilyMemberIds && slot.cookingFamilyMemberIds.length > 0) {
    return [...slot.cookingFamilyMemberIds];
  }
  return [...fallbackMemberIds];
}

/** Collapse consecutive slots with identical eaters into one combination row. */
export function buildCookingCombinationsFromSlots(
  slots: SlotInputType[],
  fallbackMemberIds: string[] = [],
): CookingCombination[] {
  const combinations: CookingCombination[] = [];

  for (const slot of slots) {
    const memberIds = resolveSlotAudienceIds(slot, fallbackMemberIds);
    const last = combinations[combinations.length - 1];

    if (last && sameAudience(last.memberIds, memberIds)) {
      last.count += 1;
    } else {
      combinations.push({ count: 1, memberIds: [...memberIds] });
    }
  }

  return combinations.length > 0
    ? combinations
    : [{ count: 1, memberIds: [...fallbackMemberIds] }];
}

/**
 * Full recipe-page href for a planner slot's title link.
 * Always attaches `?cook=` so the recipe page can show the plan banner.
 * `fallbackMemberIds` should be the household ids (same fallback as the card UI).
 */
export function getRecipeCookingHref(
  recipeSlug: string,
  relevantSlots: SlotInputType[],
  fallbackMemberIds: string[] = [],
): string {
  const combinations = buildCookingCombinationsFromSlots(
    relevantSlots,
    fallbackMemberIds,
  );
  // Slot dates power the "Meals setup for 14th Jun…" banner on the recipe page.
  const dateKeys = relevantSlots.map((slot) =>
    slot.date.toISOString().slice(0, 10),
  );
  const cook = encodePlanCookParam(combinations, dateKeys);
  return `${ROUTES.recipe(recipeSlug)}?cook=${encodeURIComponent(cook)}`;
}
