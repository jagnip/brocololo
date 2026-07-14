import type { FamilyMemberRow } from "@/lib/db/family-members";
import { getFamilyMemberIngredientAmountPerMeal } from "@/lib/log/helpers";
import { getIngredientDisplayName } from "@/lib/ingredients/format";
import {
  formatIngredientAmount,
  getRecipeFamilyMemberLabel,
  getSortedFamilyMembers,
  getUnitDisplayName,
} from "@/lib/recipes/helpers";
import {
  resolveIngredientLineForMember,
  type BaseIngredientRow,
  type MemberAdjustmentRow,
  type ResolvedIngredientLine,
} from "@/lib/recipes/resolve-ingredient-lines";

/** Minimal ingredient catalog row for name resolution in summaries. */
export type IngredientCatalogEntry = {
  id: string;
  name: string;
  brand?: string | null;
  descriptor?: string | null;
};

/** Minimal unit row for display labels. */
export type UnitCatalogEntry = {
  id: string;
  name: string;
  namePlural?: string | null;
};

export type ConsumableIngredientLine = {
  ingredientId: string;
  unitId: string;
  amount: number;
};

/** Per-person default when no explicit MODIFY amount is set. */
export function getDefaultPerPersonAmount(
  batchAmount: number | null | undefined,
  servings: number,
): number | null {
  if (
    batchAmount == null ||
    !Number.isFinite(batchAmount) ||
    batchAmount <= 0 ||
    !Number.isFinite(servings) ||
    servings <= 0
  ) {
    return null;
  }
  return Number((batchAmount / servings).toFixed(6));
}

/** Count badge for collapsed People action button. */
export function getMemberAdjustmentCount(
  memberAdjustments: MemberAdjustmentRow[] | undefined,
): number {
  return memberAdjustments?.length ?? 0;
}

export function hasIngredientNote(additionalInfo: string | null | undefined): boolean {
  return Boolean(additionalInfo?.trim());
}

/** Whether the base row is quantified enough to add person adjustments. */
export function canAddMemberAdjustments(input: {
  ingredientId: string | null | undefined;
  amount: number | null | undefined;
  unitId: string | null | undefined;
}): boolean {
  return Boolean(
    input.ingredientId &&
      input.amount != null &&
      input.amount > 0 &&
      input.unitId,
  );
}

/** Human-readable per-person default hint, e.g. "50g ÷ 4 = 12.5g default per person". */
export function formatDefaultPerPersonHint(input: {
  batchAmount: number | null | undefined;
  unitName: string | null | undefined;
  servings: number;
}): string | null {
  const perPerson = getDefaultPerPersonAmount(input.batchAmount, input.servings);
  if (perPerson == null || !input.unitName) {
    return null;
  }
  const batchLabel = formatIngredientAmount(input.batchAmount!, 2);
  const perPersonLabel = formatIngredientAmount(perPerson, 2);
  return `${batchLabel}${input.unitName} ÷ ${input.servings} = ${perPersonLabel}${input.unitName} default per person`;
}

export function getIngredientCatalogLabel(
  ingredientId: string | null | undefined,
  catalog: Map<string, IngredientCatalogEntry>,
): string {
  if (!ingredientId) {
    return "Unknown ingredient";
  }
  const entry = catalog.get(ingredientId);
  if (!entry) {
    return "Unknown ingredient";
  }
  return getIngredientDisplayName(
    entry.name,
    entry.brand ?? null,
    entry.descriptor ?? null,
  );
}

function formatResolvedAmountLabel(
  amount: number | null | undefined,
  unitId: string | null | undefined,
  unitsById: Map<string, UnitCatalogEntry>,
): string {
  if (amount == null) {
    return "";
  }
  const unit = unitId ? unitsById.get(unitId) : undefined;
  const amountLabel = formatIngredientAmount(amount, 2);
  if (!unit) {
    return amountLabel;
  }
  const unitLabel = getUnitDisplayName({
    amount,
    unitName: unit.name,
    unitNamePlural: unit.namePlural ?? null,
  });
  return `${amountLabel} ${unitLabel}`;
}

export type AdjustmentSummaryLine = {
  familyMemberId: string;
  personLabel: string;
  kind: "MODIFY" | "SKIP";
  detail: string;
};

/** Read-only summary lines for view-mode Personal adjustments panel. */
export function buildAdjustmentSummaryLines(input: {
  memberAdjustments: MemberAdjustmentRow[];
  familyMembers: FamilyMemberRow[];
  ingredientCatalog: Map<string, IngredientCatalogEntry>;
  unitsById: Map<string, UnitCatalogEntry>;
  servings: number;
  batchAmount: number | null | undefined;
  batchUnitId: string | null | undefined;
}): AdjustmentSummaryLine[] {
  const sortedMembers = getSortedFamilyMembers(input.familyMembers);
  const memberById = new Map(sortedMembers.map((member) => [member.id, member]));

  return [...input.memberAdjustments]
    .sort((a, b) => {
      const aOrder =
        sortedMembers.findIndex((member) => member.id === a.familyMemberId) ??
        999;
      const bOrder =
        sortedMembers.findIndex((member) => member.id === b.familyMemberId) ??
        999;
      return aOrder - bOrder;
    })
    .map((adjustment) => {
      const member = memberById.get(adjustment.familyMemberId);
      const personLabel = member
        ? getRecipeFamilyMemberLabel(member, input.familyMembers)
        : "Unknown person";

      if (adjustment.kind === "SKIP") {
        return {
          familyMemberId: adjustment.familyMemberId,
          personLabel,
          kind: "SKIP",
          detail: "Not in their portion",
        };
      }

      const ingredientLabel = getIngredientCatalogLabel(
        adjustment.ingredientId,
        input.ingredientCatalog,
      );
      const amountLabel = formatResolvedAmountLabel(
        adjustment.amount ??
          getDefaultPerPersonAmount(input.batchAmount, input.servings),
        adjustment.unitId ?? input.batchUnitId,
        input.unitsById,
      );

      return {
        familyMemberId: adjustment.familyMemberId,
        personLabel,
        kind: "MODIFY",
        detail: `${ingredientLabel}${amountLabel ? ` ${amountLabel}` : ""}`,
      };
    });
}

/** Default MODIFY adjustment fields when adding a new person row. */
export function buildDefaultModifyAdjustment(input: {
  familyMemberId: string;
  baseIngredientId: string;
  baseAmount: number;
  baseUnitId: string;
  servings: number;
}): MemberAdjustmentRow {
  return {
    familyMemberId: input.familyMemberId,
    kind: "MODIFY",
    ingredientId: input.baseIngredientId,
    amount: getDefaultPerPersonAmount(input.baseAmount, input.servings),
    unitId: input.baseUnitId,
    additionalInfo: null,
  };
}

export function buildDefaultSkipAdjustment(familyMemberId: string): MemberAdjustmentRow {
  return {
    familyMemberId,
    kind: "SKIP",
    ingredientId: null,
    amount: null,
    unitId: null,
    additionalInfo: null,
  };
}

type ResolveConsumableParams = {
  row: BaseIngredientRow;
  familyMemberId: string;
  recipeServings: number;
  familyMembers: Array<{ id: string; isSelf: boolean }>;
  memberPortions: Array<{ familyMemberId: string; multiplier: number }>;
  cookingFamilyMemberIds?: string[];
  recipeAudienceFamilyMemberIds?: string[];
  /** When set, scales batch amount before portion math (recipe view / log). */
  batchScaleFactor?: number;
  ingredientCatalog?: Map<string, IngredientCatalogEntry>;
};

/**
 * Resolves a recipe ingredient row to a consumable line (ingredient + unit + amount)
 * for log, planner pool, groceries, and nutrition.
 */
export function resolveConsumableIngredientLine(
  params: ResolveConsumableParams,
): ConsumableIngredientLine | null {
  const batchScaleFactor = params.batchScaleFactor ?? 1;
  const scaledRow: BaseIngredientRow = {
    ...params.row,
    amount:
      params.row.amount == null
        ? null
        : params.row.amount * batchScaleFactor,
  };

  const resolved = resolveIngredientLineForMember(
    scaledRow,
    params.familyMemberId,
  );
  if (!resolved) {
    return null;
  }

  const amount = resolveConsumableAmount({
    resolved,
    row: scaledRow,
    familyMemberId: params.familyMemberId,
    recipeServings: params.recipeServings,
    familyMembers: params.familyMembers,
    memberPortions: params.memberPortions,
    cookingFamilyMemberIds: params.cookingFamilyMemberIds,
    recipeAudienceFamilyMemberIds: params.recipeAudienceFamilyMemberIds,
  });

  if (amount == null || amount <= 0 || !resolved.ingredientId || !resolved.unitId) {
    return null;
  }

  return {
    ingredientId: resolved.ingredientId,
    unitId: resolved.unitId,
    amount: Math.round(amount * 1000) / 1000,
  };
}

function resolveConsumableAmount(input: {
  resolved: ResolvedIngredientLine;
  row: BaseIngredientRow;
  familyMemberId: string;
  recipeServings: number;
  familyMembers: Array<{ id: string; isSelf: boolean }>;
  memberPortions: Array<{ familyMemberId: string; multiplier: number }>;
  cookingFamilyMemberIds?: string[];
  recipeAudienceFamilyMemberIds?: string[];
}): number | null {
  if (input.resolved.kind === "modify" && input.resolved.amount != null) {
    return input.resolved.amount;
  }

  // Default line: use existing portion math on the (possibly scaled) batch row.
  return getFamilyMemberIngredientAmountPerMeal({
    amount: input.row.amount,
    memberAdjustments: input.row.memberAdjustments,
    familyMemberId: input.familyMemberId,
    recipeServings: input.recipeServings,
    familyMembers: input.familyMembers,
    memberPortions: input.memberPortions,
    cookingFamilyMemberIds: input.cookingFamilyMemberIds,
    recipeAudienceFamilyMemberIds: input.recipeAudienceFamilyMemberIds,
  });
}

/** Resolve all quantified ingredient rows for one family member (log, planner, etc.). */
export function resolveRecipeIngredientRowsForMember(params: {
  recipeIngredients: Array<{
    id: string;
    ingredientId: string;
    amount: number | null;
    unit?: { id: string } | null;
    additionalInfo: string | null;
    memberAdjustments: MemberAdjustmentRow[];
  }>;
  familyMemberId: string;
  recipeServings: number;
  familyMembers: Array<{ id: string; isSelf: boolean }>;
  memberPortions: Array<{ familyMemberId: string; multiplier: number }>;
  audienceMemberIds: string[];
  cookingFamilyMemberIds?: string[];
  batchScaleFactor?: number;
}): ConsumableIngredientLine[] {
  const {
    recipeIngredients,
    familyMemberId,
    recipeServings,
    familyMembers,
    memberPortions,
    audienceMemberIds,
    cookingFamilyMemberIds,
    batchScaleFactor = 1,
  } = params;

  const cookingIds = cookingFamilyMemberIds ?? audienceMemberIds;

  return recipeIngredients.flatMap((recipeIngredient) => {
    if (recipeIngredient.amount == null || !recipeIngredient.unit?.id) {
      return [];
    }

    const consumable = resolveConsumableIngredientLine({
      row: {
        id: recipeIngredient.id,
        ingredientId: recipeIngredient.ingredientId,
        amount: recipeIngredient.amount,
        unitId: recipeIngredient.unit.id,
        additionalInfo: recipeIngredient.additionalInfo,
        memberAdjustments: recipeIngredient.memberAdjustments,
      },
      familyMemberId,
      recipeServings,
      familyMembers,
      memberPortions,
      cookingFamilyMemberIds: cookingIds,
      recipeAudienceFamilyMemberIds: audienceMemberIds,
      batchScaleFactor,
    });

    return consumable ? [consumable] : [];
  });
}

export function buildIngredientCatalogMap(
  ingredients: IngredientCatalogEntry[],
): Map<string, IngredientCatalogEntry> {
  return new Map(ingredients.map((entry) => [entry.id, entry]));
}

export function buildUnitsCatalogMap(
  ingredients: Array<{
    unitConversions: Array<{
      unitId: string;
      unit: { id: string; name: string; namePlural?: string | null };
    }>;
  }>,
): Map<string, UnitCatalogEntry> {
  const map = new Map<string, UnitCatalogEntry>();
  for (const ingredient of ingredients) {
    for (const conversion of ingredient.unitConversions) {
      map.set(conversion.unitId, {
        id: conversion.unit.id,
        name: conversion.unit.name,
        namePlural: conversion.unit.namePlural ?? null,
      });
    }
  }
  return map;
}
