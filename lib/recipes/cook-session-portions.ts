import type { FamilyMemberRow } from "@/lib/db/family-members";
import { getFamilyMemberLabel } from "@/components/planner/family-member-multi-select";
import type { MemberPortionInput } from "@/lib/recipes/ingredient-adjustments";

/** One cook-session combination: N meals shared by the same people. */
export type CookingCombination = {
  count: number;
  memberIds: string[];
};

/** Stable key for comparing audiences regardless of toggle order. */
export function audienceKey(memberIds: string[]): string {
  return [...new Set(memberIds)].sort().join(",");
}

/** Default session: one meal for everyone listed. */
export function createDefaultCombinations(
  memberIds: string[],
): CookingCombination[] {
  const ids = memberIds.length > 0 ? [...memberIds] : [];
  return [{ count: 1, memberIds: ids }];
}

/** Expand combination rows into one audience entry per meal occasion. */
export function expandCombinationsToPerMealAudience(
  combinations: CookingCombination[],
): string[][] {
  const meals: string[][] = [];
  for (const combination of combinations) {
    const count = Math.max(1, combination.count);
    const ids =
      combination.memberIds.length > 0 ? [...combination.memberIds] : [];
    for (let index = 0; index < count; index += 1) {
      meals.push([...ids]);
    }
  }
  // Math helpers expect at least one meal slot when a session exists.
  return meals.length > 0 ? meals : [[]];
}

/** Total meal occasions across all combination rows. */
export function totalMealCountFromCombinations(
  combinations: CookingCombination[],
): number {
  const total = combinations.reduce(
    (sum, combination) => sum + Math.max(1, combination.count),
    0,
  );
  return Math.max(1, total);
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

/** True when the session uses multiple combinations or extras (not a single uniform row). */
export function isAdvancedDraftDifferentFromBasic(params: {
  combinations: CookingCombination[];
  extraPortions: number;
}): boolean {
  return params.combinations.length > 1 || params.extraPortions > 0;
}

/**
 * Display lines like "Jagoda · 6 portions" in household order.
 * A portion is one person's share; a meal is one occasion.
 * Only includes people with count > 0.
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
    const portionWord = count === 1 ? "portion" : "portions";
    parts.push(`${label} · ${count} ${portionWord}`);
  }
  return parts.join(" · ");
}

/** Toggle a person on a combination; never leave the row empty. */
export function toggleCombinationMember(
  memberIds: string[],
  memberId: string,
): string[] {
  if (memberIds.includes(memberId)) {
    const next = memberIds.filter((id) => id !== memberId);
    return next.length === 0 ? memberIds : next;
  }
  return [...memberIds, memberId];
}

/** Clamp combination meal count to a positive range. */
export function clampCombinationCount(count: number): number {
  return Math.max(1, Math.min(99, Math.floor(count)));
}
