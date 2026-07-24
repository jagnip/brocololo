import type { FamilyMemberRow } from "@/lib/db/family-members";
import { getFamilyMemberLabel } from "@/components/planner/family-member-multi-select";
import type { MemberPortionInput } from "@/lib/recipes/ingredient-adjustments";

/** Stable key for comparing audiences regardless of toggle order. */
export function audienceKey(memberIds: string[]): string {
  return [...new Set(memberIds)].sort().join(",");
}

/**
 * Count how many meals each person appears in.
 * Duplicate ids within one meal count once (set semantics).
 * Example: 3×[J,N] + 3×[J] → { J: 6, N: 3 }.
 */
export function derivePersonMealCounts(
  perMealAudience: string[][],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const mealIds of perMealAudience) {
    const unique = new Set(mealIds);
    for (const id of unique) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

/** Household-ordered union of everyone who appears in any meal. */
export function deriveCookingUnionIds(
  perMealAudience: string[][],
  familyMembers: FamilyMemberRow[],
): string[] {
  const present = new Set<string>();
  for (const mealIds of perMealAudience) {
    for (const id of mealIds) {
      present.add(id);
    }
  }
  return familyMembers
    .filter((member) => present.has(member.id))
    .map((member) => member.id);
}

export type BatchPortionWeight = {
  familyMemberId: string;
  /** personMealCounts[p] × multiplier_p — used for batch split pie. */
  weight: number;
  mealCount: number;
  multiplier: number;
};

/**
 * Batch portion weights for the portion-split chart.
 * weight_p = meals_p × multiplier_p (how much of the batch this person claims).
 */
export function deriveBatchPortionWeights(
  personMealCounts: Map<string, number>,
  familyMembers: FamilyMemberRow[],
  memberPortions: MemberPortionInput[],
): BatchPortionWeight[] {
  const multiplierById = new Map(
    memberPortions.map((portion) => [
      portion.familyMemberId,
      portion.multiplier,
    ]),
  );

  return familyMembers
    .map((member) => {
      const mealCount = personMealCounts.get(member.id) ?? 0;
      const multiplier = multiplierById.get(member.id) ?? 1;
      return {
        familyMemberId: member.id,
        mealCount,
        multiplier,
        weight: mealCount * multiplier,
      };
    })
    .filter((entry) => entry.weight > 0);
}

/** True when draft differs from uniform basic (any meal ≠ basic selection, or extras > 0). */
export function isAdvancedDraftDifferentFromBasic(params: {
  perMealAudience: string[][];
  cookingFamilyMemberIds: string[];
  extraPortions: number;
}): boolean {
  if (params.extraPortions > 0) {
    return true;
  }
  const basicKey = audienceKey(params.cookingFamilyMemberIds);
  return params.perMealAudience.some(
    (mealIds) => audienceKey(mealIds) !== basicKey,
  );
}

/**
 * Display lines like "Jagoda · 6 meals" in household order.
 * Only includes people with mealCount > 0.
 */
export function formatPersonMealSummary(
  personMealCounts: Map<string, number>,
  familyMembers: FamilyMemberRow[],
): string {
  const parts: string[] = [];
  for (const [index, member] of familyMembers.entries()) {
    const count = personMealCounts.get(member.id) ?? 0;
    if (count <= 0) {
      continue;
    }
    const label = getFamilyMemberLabel(member, index);
    const mealWord = count === 1 ? "meal" : "meals";
    parts.push(`${label} · ${count} ${mealWord}`);
  }
  return parts.join(" · ");
}

/** Seed N identical meals from the basic cooking audience. */
export function seedPerMealAudience(
  mealCount: number,
  cookingFamilyMemberIds: string[],
): string[][] {
  const seed = [...cookingFamilyMemberIds];
  return Array.from({ length: Math.max(1, mealCount) }, () => [...seed]);
}

/** Resize meal list: append seeded meals or drop trailing. */
export function resizePerMealAudience(
  current: string[][],
  nextMealCount: number,
  seedMemberIds: string[],
): string[][] {
  const count = Math.max(1, nextMealCount);
  if (current.length === count) {
    return current;
  }
  if (current.length < count) {
    const appended = Array.from({ length: count - current.length }, () => [
      ...seedMemberIds,
    ]);
    return [...current, ...appended];
  }
  return current.slice(0, count);
}

/** Add a member to every meal (for applied-mode people chip add). */
export function addMemberToAllMeals(
  perMealAudience: string[][],
  memberId: string,
): string[][] {
  return perMealAudience.map((mealIds) =>
    mealIds.includes(memberId) ? mealIds : [...mealIds, memberId],
  );
}

/**
 * Remove a member from every meal.
 * Meals that would become empty keep their previous ids (caller should guard).
 */
export function removeMemberFromAllMeals(
  perMealAudience: string[][],
  memberId: string,
): string[][] {
  return perMealAudience.map((mealIds) => {
    if (!mealIds.includes(memberId)) {
      return mealIds;
    }
    const next = mealIds.filter((id) => id !== memberId);
    // Guard: never leave a meal with zero people.
    return next.length === 0 ? mealIds : next;
  });
}

/** Deep-clone meal audience arrays for draft/applied copies. */
export function clonePerMealAudience(perMealAudience: string[][]): string[][] {
  return perMealAudience.map((mealIds) => [...mealIds]);
}
