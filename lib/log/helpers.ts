import { derivePortionTargetingFromAdjustments } from "@/lib/recipes/resolve-ingredient-lines";

type FamilyMemberForPortion = {
  id: string;
  isSelf: boolean;
};

type MemberPortion = {
  familyMemberId: string;
  multiplier: number;
};

type MemberAdjustmentForPortion = {
  familyMemberId: string;
  kind: "MODIFY" | "SKIP";
  amount?: number | null;
};

function getMemberMultiplier(
  member: FamilyMemberForPortion,
  memberPortions: MemberPortion[],
): number {
  return (
    memberPortions.find((portion) => portion.familyMemberId === member.id)
      ?.multiplier ?? 1
  );
}

type FamilyMemberPortionParams = {
  amount: number | null;
  appliesToEveryone: boolean;
  targetFamilyMemberIds: string[];
  familyMemberId: string;
  familyMembers: FamilyMemberForPortion[];
  memberPortions: MemberPortion[];
  cookingFamilyMemberIds?: string[];
  /** Recipe audience; when omitted, all cooking members are treated as on-recipe. */
  recipeAudienceFamilyMemberIds?: string[];
};

function getSharedIngredientApplicableWeight(
  cookingMembers: FamilyMemberForPortion[],
  recipeAudienceIdSet: Set<string>,
  memberPortions: MemberPortion[],
): number {
  return cookingMembers.reduce((sum, member) => {
    if (recipeAudienceIdSet.has(member.id)) {
      return sum + getMemberMultiplier(member, memberPortions);
    }
    // Off-recipe diners still get one shared portion each.
    return sum + 1;
  }, 0);
}

function getFamilyMemberPortionWeights(
  params: FamilyMemberPortionParams,
): { selectedWeight: number; applicableWeight: number } | null {
  const {
    amount,
    appliesToEveryone,
    targetFamilyMemberIds,
    familyMemberId,
    familyMembers,
    memberPortions,
    cookingFamilyMemberIds,
    recipeAudienceFamilyMemberIds,
  } = params;

  if (amount == null) return null;

  const cookingMemberIdSet = new Set(
    cookingFamilyMemberIds ?? familyMembers.map((member) => member.id),
  );
  const cookingMembers = familyMembers.filter((member) =>
    cookingMemberIdSet.has(member.id),
  );
  if (cookingMembers.length === 0) return null;

  const selectedMember = cookingMembers.find((member) => member.id === familyMemberId);
  if (!selectedMember) return null;

  const recipeAudienceIdSet = new Set(
    recipeAudienceFamilyMemberIds ?? cookingMembers.map((member) => member.id),
  );
  const isOnRecipe = recipeAudienceIdSet.has(familyMemberId);

  if (!appliesToEveryone) {
    if (!isOnRecipe) {
      return null;
    }

    const applicableMembers = cookingMembers.filter((member) =>
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
    return { selectedWeight, applicableWeight };
  }

  const applicableWeight = getSharedIngredientApplicableWeight(
    cookingMembers,
    recipeAudienceIdSet,
    memberPortions,
  );
  if (!Number.isFinite(applicableWeight) || applicableWeight <= 0) return null;

  const selectedWeight = isOnRecipe
    ? getMemberMultiplier(selectedMember, memberPortions)
    : 1;
  return { selectedWeight, applicableWeight };
}

/**
 * Splits a fully scaled recipe row across family cooks (separate batches).
 * Use when amount already reflects all current servings on the recipe page.
 */
export function getFamilyMemberIngredientAmountForScaledBatch(
  params: FamilyMemberPortionParams,
): number | null {
  const weights = getFamilyMemberPortionWeights(params);
  if (weights == null || params.amount == null) return null;

  const { selectedWeight, applicableWeight } = weights;
  return (params.amount * selectedWeight) / applicableWeight;
}

export function getFamilyMemberIngredientAmountPerMeal(params: {
  amount: number | null;
  appliesToEveryone?: boolean;
  targetFamilyMemberIds?: string[];
  memberAdjustments?: MemberAdjustmentForPortion[];
  familyMemberId: string;
  recipeServings: number;
  familyMembers: FamilyMemberForPortion[];
  memberPortions: MemberPortion[];
  cookingFamilyMemberIds?: string[];
  recipeAudienceFamilyMemberIds?: string[];
}): number | null {
  const {
    amount,
    appliesToEveryone = true,
    targetFamilyMemberIds = [],
    memberAdjustments = [],
    familyMemberId,
    recipeServings,
    familyMembers,
    memberPortions,
    cookingFamilyMemberIds,
    recipeAudienceFamilyMemberIds,
  } = params;

  if (!Number.isFinite(recipeServings) || recipeServings <= 0) return null;

  const modifyAdjustment = memberAdjustments.find(
    (adjustment) =>
      adjustment.familyMemberId === familyMemberId && adjustment.kind === "MODIFY",
  );
  if (modifyAdjustment?.amount != null) {
    return modifyAdjustment.amount;
  }

  const audienceIds =
    recipeAudienceFamilyMemberIds ??
    familyMembers.map((member) => member.id);
  const targeting =
    memberAdjustments.length > 0
      ? derivePortionTargetingFromAdjustments(memberAdjustments, audienceIds)
      : { appliesToEveryone, targetFamilyMemberIds };

  const weights = getFamilyMemberPortionWeights({
    amount,
    appliesToEveryone: targeting.appliesToEveryone,
    targetFamilyMemberIds: targeting.targetFamilyMemberIds,
    familyMemberId,
    familyMembers,
    memberPortions,
    cookingFamilyMemberIds,
    recipeAudienceFamilyMemberIds,
  });
  if (weights == null || amount == null) return null;

  const cookingMemberIdSet = new Set(
    cookingFamilyMemberIds ?? familyMembers.map((member) => member.id),
  );
  const cookingMembers = familyMembers.filter((member) =>
    cookingMemberIdSet.has(member.id),
  );
  const recipeAudienceIdSet = new Set(
    recipeAudienceFamilyMemberIds ?? cookingMembers.map((member) => member.id),
  );
  const isOnRecipe = recipeAudienceIdSet.has(familyMemberId);
  const { selectedWeight, applicableWeight } = weights;

  if (!isOnRecipe) {
    // Off-recipe diners only take a flat share of shared ingredients for this cook.
    return (amount * selectedWeight) / applicableWeight;
  }

  // Servings are plate-count yield. One cooked meal consumes audienceCount / servings
  // of the recipe, then multipliers divide that meal among applicable members.
  return (
    (amount * cookingMembers.length * selectedWeight) /
    (recipeServings * applicableWeight)
  );
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
