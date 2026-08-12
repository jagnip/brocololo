import type { FamilyMemberRow } from "@/lib/db/family-members";
import {
  resolveRecipeIngredientRowsForMember,
  type MemberPortionInput,
} from "@/lib/recipes/ingredient-adjustments";
import type { MemberAdjustmentRow } from "@/lib/recipes/resolve-ingredient-lines";
import { derivePersonMealCounts } from "@/lib/recipes/cook-session-portions";
import { COOK_SESSION_EXTRAS_SHARE_ID } from "@/lib/recipes/shared-portion-shares";

/** Per-person share of an aggregated cook-session ingredient line. */
export type CookingAggregatedMemberAmount = {
  /** Family member id, or `COOK_SESSION_EXTRAS_SHARE_ID` for anonymous extras. */
  familyMemberId: string;
  amount: number;
};

/** Aggregated resolved consumable line for the recipe view cook session. */
export type CookingAggregatedLine = {
  key: string;
  ingredientId: string;
  unitId: string;
  /**
   * Total amount for selected eaters × meals (includes row-level manual scale).
   * Null for qualitative rows (salt/pepper — no numeric amount).
   */
  resolvedAmount: number | null;
  /** Amount attributed to each selected eater for this line (empty for qualitative). */
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

function resolvePersonMealCounts(params: {
  cookingFamilyMemberIds: string[];
  mealCount: number;
  personMealCounts?: Map<string, number>;
  perMealAudience?: string[][];
}): Map<string, number> {
  if (params.personMealCounts) {
    return params.personMealCounts;
  }
  if (params.perMealAudience) {
    return derivePersonMealCounts(params.perMealAudience);
  }
  // Legacy: uniform mealCount × one audience.
  const counts = new Map<string, number>();
  for (const id of params.cookingFamilyMemberIds) {
    counts.set(id, params.mealCount);
  }
  return counts;
}

/**
 * Resolve and aggregate consumable lines for one ingredient section (ungrouped or group).
 * Merges by resolved ingredientId + unitId; order follows first recipe-row appearance.
 *
 * When `personMealCounts` / `perMealAudience` is provided, each person is scaled by their
 * own meal count. `extraPortions` adds anonymous 1× base shares (batch÷servings) with no
 * personal multipliers / SKIP / MODIFY — attributed as `COOK_SESSION_EXTRAS_SHARE_ID`.
 */
export function resolveCookingAggregatedLines(params: {
  recipeIngredients: RecipeIngredientForCookingDisplay[];
  recipeServings: number;
  familyMembers: FamilyMemberRow[];
  cookingFamilyMemberIds: string[];
  mealCount: number;
  audienceMemberIds: string[];
  memberPortions?: MemberPortionInput[];
  /** Per-person meal counts from advanced cooking (overrides uniform mealCount). */
  personMealCounts?: Map<string, number>;
  /** Alternative to personMealCounts — derived when provided. */
  perMealAudience?: string[][];
  /** Anonymous default portions (batch÷servings each); no person adjustments. */
  extraPortions?: number;
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
    extraPortions = 0,
  } = params;

  const memberPortions =
    params.memberPortions ?? buildMemberPortionsFromFamily(familyMembers);
  const personMealCounts = resolvePersonMealCounts({
    cookingFamilyMemberIds,
    mealCount,
    personMealCounts: params.personMealCounts,
    perMealAudience: params.perMealAudience,
  });

  // Prefer people who actually have meals; fall back to cookingFamilyMemberIds order.
  const cookingIdSet = new Set(
    [...personMealCounts.entries()]
      .filter(([, count]) => count > 0)
      .map(([id]) => id),
  );
  if (cookingIdSet.size === 0) {
    for (const id of cookingFamilyMemberIds) {
      cookingIdSet.add(id);
    }
  }
  const sortedCookingMembers = familyMembers.filter((member) =>
    cookingIdSet.has(member.id),
  );

  const orderKeys: string[] = [];
  const byKey = new Map<string, CookingAggregatedLine>();

  for (const recipeIngredient of recipeIngredients) {
    // Qualitative rows (salt/pepper/etc.): no numeric amount — still list them,
    // without people/extras badges. Keep recipe order.
    if (recipeIngredient.amount == null) {
      const key = `qualitative:${recipeIngredient.id}`;
      if (!byKey.has(key)) {
        orderKeys.push(key);
        byKey.set(key, {
          key,
          ingredientId: recipeIngredient.ingredientId,
          unitId: recipeIngredient.unit?.id ?? "",
          resolvedAmount: null,
          memberAmounts: [],
          sourceRecipeIngredientIds: [recipeIngredient.id],
          primaryRecipeIngredientId: recipeIngredient.id,
          primaryAdditionalInfo: recipeIngredient.additionalInfo,
        });
      }
      continue;
    }

    if (!recipeIngredient.unit?.id) {
      continue;
    }

    const rowScale = getRowDisplayScale?.(recipeIngredient.id) ?? 1;
    const batchAmount = recipeIngredient.amount;
    const unitId = recipeIngredient.unit.id;

    for (const member of sortedCookingMembers) {
      const memberMealCount = personMealCounts.get(member.id) ?? 0;
      if (memberMealCount <= 0) {
        continue;
      }

      const consumables = resolveRecipeIngredientRowsForMember({
        recipeIngredients: [recipeIngredient],
        familyMemberId: member.id,
        recipeServings,
        familyMembers,
        memberPortions,
        audienceMemberIds,
        cookingFamilyMemberIds: [...cookingIdSet],
        batchScaleFactor: memberMealCount,
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
          Math.round(((existing.resolvedAmount ?? 0) + scaledAmount) * 1000) /
          1000;
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

    // Anonymous extra portions: default base share only (no multipliers / SKIP / MODIFY).
    if (extraPortions > 0 && recipeServings > 0) {
      const extraAmount =
        Math.round(
          (batchAmount / recipeServings) * extraPortions * rowScale * 1000,
        ) / 1000;
      if (extraAmount > 0) {
        const key = aggregateKey(recipeIngredient.ingredientId, unitId);
        const existing = byKey.get(key);
        if (existing) {
          existing.resolvedAmount =
            Math.round(((existing.resolvedAmount ?? 0) + extraAmount) * 1000) /
            1000;
          addMemberAmount(existing, COOK_SESSION_EXTRAS_SHARE_ID, extraAmount);
          if (!existing.sourceRecipeIngredientIds.includes(recipeIngredient.id)) {
            existing.sourceRecipeIngredientIds.push(recipeIngredient.id);
          }
        } else {
          orderKeys.push(key);
          byKey.set(key, {
            key,
            ingredientId: recipeIngredient.ingredientId,
            unitId,
            resolvedAmount: extraAmount,
            memberAmounts: [
              {
                familyMemberId: COOK_SESSION_EXTRAS_SHARE_ID,
                amount: extraAmount,
              },
            ],
            sourceRecipeIngredientIds: [recipeIngredient.id],
            primaryRecipeIngredientId: recipeIngredient.id,
            primaryAdditionalInfo: recipeIngredient.additionalInfo,
          });
        }
      }
    }
  }

  return orderKeys
    .map((key) => byKey.get(key))
    .filter((line): line is CookingAggregatedLine => line != null);
}
