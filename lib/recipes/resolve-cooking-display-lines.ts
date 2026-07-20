import type { FamilyMemberRow } from "@/lib/db/family-members";
import {
  resolveRecipeIngredientRowsForMember,
  type MemberPortionInput,
} from "@/lib/recipes/ingredient-adjustments";
import type { MemberAdjustmentRow } from "@/lib/recipes/resolve-ingredient-lines";

/** Per-person share of an aggregated cook-session ingredient line. */
export type CookingAggregatedMemberAmount = {
  familyMemberId: string;
  amount: number;
};

/** Aggregated resolved consumable line for the recipe view cook session. */
export type CookingAggregatedLine = {
  key: string;
  ingredientId: string;
  unitId: string;
  /** Total amount for selected eaters × meals (includes row-level manual scale when provided). */
  resolvedAmount: number;
  /** Amount attributed to each selected eater for this line. */
  memberAmounts: CookingAggregatedMemberAmount[];
  sourceRecipeIngredientIds: string[];
  /** First contributing recipe row — used for notes and primary unit metadata. */
  primaryRecipeIngredientId: string;
  primaryAdditionalInfo: string | null;
};

export type RecipeIngredientForCookingDisplay = {
  id: string;
  ingredientId: string;
  amount: number | null;
  unit?: { id: string } | null;
  additionalInfo: string | null;
  memberAdjustments: MemberAdjustmentRow[];
};

export function buildMemberPortionsFromFamily(
  familyMembers: FamilyMemberRow[],
): MemberPortionInput[] {
  return familyMembers.map((member) => ({
    familyMemberId: member.id,
    multiplier: member.portionMultiplier ?? 1,
  }));
}

function aggregateKey(ingredientId: string, unitId: string): string {
  return `${ingredientId}:${unitId}`;
}

function addMemberAmount(
  line: CookingAggregatedLine,
  familyMemberId: string,
  amount: number,
): void {
  const existing = line.memberAmounts.find(
    (entry) => entry.familyMemberId === familyMemberId,
  );
  if (existing) {
    existing.amount = Math.round((existing.amount + amount) * 1000) / 1000;
    return;
  }
  line.memberAmounts.push({ familyMemberId, amount });
}

/**
 * Resolve and aggregate consumable lines for one ingredient section (ungrouped or group).
 * Merges by resolved ingredientId + unitId; order follows first recipe-row appearance.
 */
export function resolveCookingAggregatedLines(params: {
  recipeIngredients: RecipeIngredientForCookingDisplay[];
  recipeServings: number;
  familyMembers: FamilyMemberRow[];
  cookingFamilyMemberIds: string[];
  mealCount: number;
  audienceMemberIds: string[];
  memberPortions?: MemberPortionInput[];
  /** Manual display scale per recipe row (global × local × calorie factor). */
  getRowDisplayScale?: (recipeIngredientId: string) => number;
}): CookingAggregatedLine[] {
  const {
    recipeIngredients,
    recipeServings,
    familyMembers,
    cookingFamilyMemberIds,
    mealCount,
    audienceMemberIds,
    getRowDisplayScale,
  } = params;

  const memberPortions =
    params.memberPortions ?? buildMemberPortionsFromFamily(familyMembers);
  const cookingIdSet = new Set(cookingFamilyMemberIds);
  const sortedCookingMembers = familyMembers.filter((member) =>
    cookingIdSet.has(member.id),
  );

  const orderKeys: string[] = [];
  const byKey = new Map<string, CookingAggregatedLine>();

  for (const recipeIngredient of recipeIngredients) {
    if (recipeIngredient.amount == null || !recipeIngredient.unit?.id) {
      continue;
    }

    const rowScale = getRowDisplayScale?.(recipeIngredient.id) ?? 1;

    for (const member of sortedCookingMembers) {
      const consumables = resolveRecipeIngredientRowsForMember({
        recipeIngredients: [recipeIngredient],
        familyMemberId: member.id,
        recipeServings,
        familyMembers,
        memberPortions,
        audienceMemberIds,
        cookingFamilyMemberIds,
        batchScaleFactor: mealCount,
      });

      const consumable = consumables[0];
      if (!consumable) {
        continue;
      }

      const scaledAmount =
        Math.round(consumable.amount * rowScale * 1000) / 1000;
      const key = aggregateKey(consumable.ingredientId, consumable.unitId);
      const existing = byKey.get(key);

      if (existing) {
        existing.resolvedAmount =
          Math.round((existing.resolvedAmount + scaledAmount) * 1000) / 1000;
        addMemberAmount(existing, member.id, scaledAmount);
        if (!existing.sourceRecipeIngredientIds.includes(recipeIngredient.id)) {
          existing.sourceRecipeIngredientIds.push(recipeIngredient.id);
        }
        continue;
      }

      orderKeys.push(key);
      byKey.set(key, {
        key,
        ingredientId: consumable.ingredientId,
        unitId: consumable.unitId,
        resolvedAmount: scaledAmount,
        memberAmounts: [{ familyMemberId: member.id, amount: scaledAmount }],
        sourceRecipeIngredientIds: [recipeIngredient.id],
        primaryRecipeIngredientId: recipeIngredient.id,
        primaryAdditionalInfo: recipeIngredient.additionalInfo,
      });
    }
  }

  return orderKeys
    .map((key) => byKey.get(key))
    .filter((line): line is CookingAggregatedLine => line != null);
}
