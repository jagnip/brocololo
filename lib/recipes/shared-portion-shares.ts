/** Family member row used to compute relative portion shares for display. */
export type FamilyMemberForSharedPortion = {
  id: string;
  isSelf: boolean;
  sortOrder: number;
};

export type MemberPortionForSharedSplit = {
  familyMemberId: string;
  multiplier: number;
};

export type SharedPortionShare = {
  familyMemberId: string;
  share: number;
  multiplier: number;
  /** Absolute batch portion weight (meals × multiplier) when using batch shares. */
  weight?: number;
};

function getMemberMultiplier(
  member: Pick<FamilyMemberForSharedPortion, "id">,
  memberPortions: MemberPortionForSharedSplit[],
): number {
  return (
    memberPortions.find((portion) => portion.familyMemberId === member.id)
      ?.multiplier ?? 1
  );
}

/**
 * Relative shares from recipe portion multipliers (multiplier ÷ sum of multipliers).
 * Used for the portion split chart — independent scaling, display-only.
 */
export function getSharedPortionShares(
  audienceMembers: FamilyMemberForSharedPortion[],
  memberPortions: MemberPortionForSharedSplit[],
): SharedPortionShare[] {
  if (audienceMembers.length <= 1) {
    return [];
  }

  const ordered = [...audienceMembers].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const totalWeight = ordered.reduce(
    (sum, member) => sum + getMemberMultiplier(member, memberPortions),
    0,
  );

  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return [];
  }

  return ordered.map((member) => {
    const multiplier = getMemberMultiplier(member, memberPortions);
    return {
      familyMemberId: member.id,
      share: multiplier / totalWeight,
      multiplier,
    };
  });
}

/**
 * Batch split shares for an advanced cook session.
 * weight_p = personMealCounts[p] × multiplier_p; share = weight / Σ weights.
 * Example: J 3 + N 9 → 25% / 75%.
 */
export function getBatchPortionShares(
  audienceMembers: FamilyMemberForSharedPortion[],
  memberPortions: MemberPortionForSharedSplit[],
  personMealCounts: Map<string, number>,
): SharedPortionShare[] {
  const ordered = [...audienceMembers]
    .map((member) => {
      const mealCount = personMealCounts.get(member.id) ?? 0;
      const multiplier = getMemberMultiplier(member, memberPortions);
      return {
        member,
        multiplier,
        weight: mealCount * multiplier,
      };
    })
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => a.member.sortOrder - b.member.sortOrder);

  if (ordered.length <= 1) {
    return [];
  }

  const totalWeight = ordered.reduce((sum, entry) => sum + entry.weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return [];
  }

  return ordered.map((entry) => ({
    familyMemberId: entry.member.id,
    share: entry.weight / totalWeight,
    multiplier: entry.multiplier,
    weight: entry.weight,
  }));
}

/** Rounded display percentages that sum to 100 for pie charts. */
export function getDisplayPercentages(shares: SharedPortionShare[]): number[] {
  if (shares.length === 0) {
    return [];
  }

  const rounded = shares.map((entry) => Math.round(entry.share * 100));
  const sum = rounded.reduce((acc, value) => acc + value, 0);
  const remainder = 100 - sum;

  if (remainder !== 0) {
    rounded[rounded.length - 1] += remainder;
  }

  return rounded;
}
