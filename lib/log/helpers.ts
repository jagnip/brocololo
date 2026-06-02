type FamilyMemberForPortion = {
  id: string;
  isSelf: boolean;
};

type MemberPortion = {
  familyMemberId: string;
  multiplier: number;
};

function getMemberMultiplier(
  member: FamilyMemberForPortion,
  memberPortions: MemberPortion[],
): number {
  if (member.isSelf) {
    return 1;
  }
  return (
    memberPortions.find((portion) => portion.familyMemberId === member.id)
      ?.multiplier ?? 1
  );
}

export function getFamilyMemberIngredientAmountPerMeal(params: {
  amount: number | null;
  appliesToEveryone: boolean;
  targetFamilyMemberIds: string[];
  familyMemberId: string;
  recipeServings: number;
  familyMembers: FamilyMemberForPortion[];
  memberPortions: MemberPortion[];
}): number | null {
  const {
    amount,
    appliesToEveryone,
    targetFamilyMemberIds,
    familyMemberId,
    recipeServings,
    familyMembers,
    memberPortions,
  } = params;

  if (amount == null) return null;

  if (!Number.isFinite(recipeServings) || recipeServings <= 0) return null;

  const selectedMember = familyMembers.find(
    (member) => member.id === familyMemberId,
  );
  if (!selectedMember) return null;

  const allWeight = familyMembers.reduce(
    (sum, member) => sum + getMemberMultiplier(member, memberPortions),
    0,
  );
  if (!Number.isFinite(allWeight) || allWeight <= 0) return null;

  const applicableMembers = appliesToEveryone
    ? familyMembers
    : familyMembers.filter((member) =>
        targetFamilyMemberIds.includes(member.id),
      );
  if (!applicableMembers.some((member) => member.id === familyMemberId)) {
    return null;
  }

  const applicableWeight = applicableMembers.reduce(
    (sum, member) => sum + getMemberMultiplier(member, memberPortions),
    0,
  );
  if (!Number.isFinite(applicableWeight) || applicableWeight <= 0) return null;

  const selectedWeight = getMemberMultiplier(selectedMember, memberPortions);
  // Servings are total cooked portions. Targeted ingredients are split only
  // across the members who receive that ingredient.
  return (amount * allWeight * selectedWeight) / (recipeServings * applicableWeight);
}

export function getPersonIngredientAmountPerMeal(params: {
  amount: number | null;
  nutritionTarget: "BOTH" | "PRIMARY_ONLY" | "SECONDARY_ONLY";
  person: "primary" | "secondary";
  recipeServings: number;
  servingMultiplierForNelson: number;
}): number | null {
  const familyMembers = [
    { id: "primary", isSelf: true },
    { id: "secondary", isSelf: false },
  ];
  return getFamilyMemberIngredientAmountPerMeal({
    amount: params.amount,
    appliesToEveryone: params.nutritionTarget === "BOTH",
    targetFamilyMemberIds:
      params.nutritionTarget === "PRIMARY_ONLY"
        ? ["primary"]
        : params.nutritionTarget === "SECONDARY_ONLY"
          ? ["secondary"]
          : [],
    familyMemberId: params.person,
    recipeServings: params.recipeServings,
    familyMembers,
    memberPortions: [
      {
        familyMemberId: "secondary",
        multiplier: params.servingMultiplierForNelson,
      },
    ],
  });
}
