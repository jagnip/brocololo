import { derivePortionTargetingFromAdjustments } from "@/lib/recipes/resolve-ingredient-lines";

type FamilyMemberForPortion = {
  id: string;
  isSelf: boolean;
  /** Household default portion multiplier (1× = base per meal). */
  portionMultiplier?: number;
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

/** Resolve multiplier — household default wins; legacy recipe rows are fallback only. */
export function getPersonPortionMultiplier(
  familyMemberId: string,
  familyMembers: FamilyMemberForPortion[],
  memberPortions: MemberPortion[],
): number {
  const fromMember = familyMembers.find((member) => member.id === familyMemberId)
    ?.portionMultiplier;
  if (fromMember != null && Number.isFinite(fromMember) && fromMember > 0) {
    return fromMember;
  }
  const fromLegacy = memberPortions.find(
    (portion) => portion.familyMemberId === familyMemberId,
  )?.multiplier;
  if (fromLegacy != null && Number.isFinite(fromLegacy) && fromLegacy > 0) {
    return fromLegacy;
  }
  return 1;
}

type FamilyMemberPortionParams = {
  amount: number | null;
  appliesToEveryone: boolean;
  targetFamilyMemberIds: string[];
  familyMemberId: string;
  recipeServings: number;
  familyMembers: FamilyMemberForPortion[];
  memberPortions: MemberPortion[];
  /** @deprecated Recipe audience removed — kept for callers during migration. */
  cookingFamilyMemberIds?: string[];
  /** @deprecated Recipe audience removed — kept for callers during migration. */
  recipeAudienceFamilyMemberIds?: string[];
};

function isPersonApplicableForTargeting(
  params: Pick<
    FamilyMemberPortionParams,
    "appliesToEveryone" | "targetFamilyMemberIds" | "familyMemberId"
  >,
): boolean {
  if (params.appliesToEveryone) {
    return true;
  }
  return params.targetFamilyMemberIds.includes(params.familyMemberId);
}

/**
 * Per-person amount for one meal from a recipe batch row.
 * Formula: (batch ÷ servings) × personMultiplier — independent per person, not a weighted split.
 */
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
  } = params;

  if (
    amount == null ||
    !Number.isFinite(recipeServings) ||
    recipeServings <= 0
  ) {
    return null;
  }

  const modifyAdjustment = memberAdjustments.find(
    (adjustment) =>
      adjustment.familyMemberId === familyMemberId && adjustment.kind === "MODIFY",
  );
  if (modifyAdjustment?.amount != null) {
    return modifyAdjustment.amount;
  }

  const audienceIds =
    params.recipeAudienceFamilyMemberIds ??
    params.cookingFamilyMemberIds ??
    familyMembers.map((member) => member.id);
  const targeting =
    memberAdjustments.length > 0
      ? derivePortionTargetingFromAdjustments(memberAdjustments, audienceIds)
      : { appliesToEveryone, targetFamilyMemberIds };

  if (
    !isPersonApplicableForTargeting({
      appliesToEveryone: targeting.appliesToEveryone,
      targetFamilyMemberIds: targeting.targetFamilyMemberIds,
      familyMemberId,
    })
  ) {
    return null;
  }

  const multiplier = getPersonPortionMultiplier(
    familyMemberId,
    familyMembers,
    memberPortions,
  );
  return Number(((amount / recipeServings) * multiplier).toFixed(6));
}

/**
 * Per-person amount when the row amount is already display-scaled (recipe page badges).
 */
export function getFamilyMemberIngredientAmountForScaledBatch(
  params: FamilyMemberPortionParams,
): number | null {
  return getFamilyMemberIngredientAmountPerMeal({
    amount: params.amount,
    appliesToEveryone: params.appliesToEveryone,
    targetFamilyMemberIds: params.targetFamilyMemberIds,
    familyMemberId: params.familyMemberId,
    recipeServings: params.recipeServings,
    familyMembers: params.familyMembers,
    memberPortions: params.memberPortions,
  });
}

export function getPersonIngredientAmountPerMeal(params: {
  amount: number | null;
  nutritionTarget: "BOTH" | "PRIMARY_ONLY" | "SECONDARY_ONLY";
  person: "primary" | "secondary";
  recipeServings: number;
  servingMultiplierForNelson: number;
}): number | null {
  const familyMembers = [
    { id: "primary", isSelf: true, portionMultiplier: 1 },
    {
      id: "secondary",
      isSelf: false,
      portionMultiplier: params.servingMultiplierForNelson,
    },
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
    memberPortions: [],
  });
}
