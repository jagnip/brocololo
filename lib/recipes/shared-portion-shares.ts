/** Family member row used to compute shared-ingredient portion shares. */
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
 * Portion shares for ingredients marked “everyone” among the recipe audience.
 * Matches the split used in `getFamilyMemberIngredientAmountPerMeal` when all
 * audience members are applicable.
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
