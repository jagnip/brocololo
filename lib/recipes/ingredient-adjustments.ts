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

export type MemberPortionInput = {
  familyMemberId: string;
  multiplier: number;
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

export function getMemberPortionMultiplier(
  familyMemberId: string,
  memberPortions: MemberPortionInput[] | undefined,
): number {
  const portion = memberPortions?.find(
    (entry) => entry.familyMemberId === familyMemberId,
  );
  return portion?.multiplier ?? 1;
}

/** Compact portion badge label — null when multiplier is default (1×). */
export function formatPortionMultiplierBadgeLabel(multiplier: number): string | null {
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier === 1) {
    return null;
  }
  const formatted = Number.isInteger(multiplier)
    ? String(multiplier)
    : multiplier.toFixed(2).replace(/\.?0+$/, "");
  return `×${formatted}`;
}

/** Default share for one person after portion-size multiplier is applied. */
export function getDefaultPerPersonAmountForMember(
  batchAmount: number | null | undefined,
  servings: number,
  portionMultiplier: number,
): number | null {
  const base = getDefaultPerPersonAmount(batchAmount, servings);
  if (base == null || !Number.isFinite(portionMultiplier) || portionMultiplier <= 0) {
    return base;
  }
  return Number((base * portionMultiplier).toFixed(6));
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

export type PortionSizeSummaryRow = {
  familyMemberId: string;
  personLabel: string;
  portionBadgeLabel: string | null;
  /** Per-meal share from the batch row (shared-ingredient split). */
  shareDetail: string | null;
};

type IngredientShareResolutionInput = {
  baseIngredientId: string;
  batchAmount: number | null | undefined;
  batchUnitId: string | null | undefined;
  memberAdjustments: MemberAdjustmentRow[];
  servings: number;
  batchScaleFactor?: number;
  familyMembers: FamilyMemberRow[];
  audienceMemberIds: string[];
  memberPortions?: MemberPortionInput[];
};

/** Same consumable resolution as log pool / planner — keeps People panel in sync. */
function resolveIngredientShareForMember(
  input: IngredientShareResolutionInput,
  familyMemberId: string,
): ConsumableIngredientLine | null {
  if (
    input.batchAmount == null ||
    input.batchAmount <= 0 ||
    !input.batchUnitId ||
    !input.baseIngredientId
  ) {
    return null;
  }

  return resolveConsumableIngredientLine({
    row: {
      ingredientId: input.baseIngredientId,
      amount: input.batchAmount,
      unitId: input.batchUnitId,
      additionalInfo: null,
      memberAdjustments: input.memberAdjustments,
    },
    familyMemberId,
    recipeServings: input.servings,
    familyMembers: input.familyMembers.map((member) => ({
      id: member.id,
      isSelf: member.isSelf,
    })),
    memberPortions: input.memberPortions ?? [],
    cookingFamilyMemberIds: input.audienceMemberIds,
    recipeAudienceFamilyMemberIds: input.audienceMemberIds,
    batchScaleFactor: input.batchScaleFactor ?? 1,
  });
}

/** Audience members with per-meal share amounts for shared-ingredient splits. */
export function buildPortionSizeSummaryRows(input: {
  familyMembers: FamilyMemberRow[];
  audienceMemberIds: string[];
  memberPortions?: MemberPortionInput[];
  baseIngredientId: string;
  batchAmount: number | null | undefined;
  batchUnitId: string | null | undefined;
  memberAdjustments: MemberAdjustmentRow[];
  servings: number;
  batchScaleFactor?: number;
  unitsById: Map<string, UnitCatalogEntry>;
  /** People with MODIFY/SKIP on this row — listed under adjustments instead. */
  excludeAdjustedMemberIds?: string[];
}): PortionSizeSummaryRow[] {
  const sortedMembers = getSortedFamilyMembers(input.familyMembers);
  const audienceSet = new Set(input.audienceMemberIds);
  const excludedIds = new Set(input.excludeAdjustedMemberIds ?? []);
  const resolutionInput: IngredientShareResolutionInput = {
    baseIngredientId: input.baseIngredientId,
    batchAmount: input.batchAmount,
    batchUnitId: input.batchUnitId,
    memberAdjustments: input.memberAdjustments,
    servings: input.servings,
    batchScaleFactor: input.batchScaleFactor,
    familyMembers: input.familyMembers,
    audienceMemberIds: input.audienceMemberIds,
    memberPortions: input.memberPortions,
  };

  return sortedMembers
    .filter((member) => audienceSet.has(member.id) && !excludedIds.has(member.id))
    .map((member) => {
      const consumable = resolveIngredientShareForMember(
        resolutionInput,
        member.id,
      );
      const shareDetail = formatResolvedAmountLabel(
        consumable?.amount ?? null,
        consumable?.unitId ?? input.batchUnitId,
        input.unitsById,
      );

      return {
        familyMemberId: member.id,
        personLabel: getRecipeFamilyMemberLabel(member, input.familyMembers),
        portionBadgeLabel: formatPortionMultiplierBadgeLabel(
          getMemberPortionMultiplier(member.id, input.memberPortions),
        ),
        shareDetail: shareDetail || null,
      };
    });
}

export function shouldShowPortionShareSummary(input: {
  audienceMemberIds: string[];
  batchAmount: number | null | undefined;
  batchUnitId: string | null | undefined;
  memberAdjustments: MemberAdjustmentRow[];
}): boolean {
  if (
    input.audienceMemberIds.length <= 1 ||
    input.batchAmount == null ||
    input.batchAmount <= 0 ||
    !input.batchUnitId
  ) {
    return false;
  }

  const adjustedIds = new Set(
    input.memberAdjustments.map((row) => row.familyMemberId),
  );
  return input.audienceMemberIds.some((id) => !adjustedIds.has(id));
}

export type AdjustmentSummaryLine = {
  familyMemberId: string;
  personLabel: string;
  kind: "MODIFY" | "SKIP";
  detail: string;
  /** Recipe-level portion size when not 1× (e.g. ×2). */
  portionBadgeLabel: string | null;
  /** View-mode badge for the adjustment type. */
  adjustmentBadgeLabel: "Custom" | "Skipped" | null;
};

/** Read-only summary lines for view-mode Personal adjustments panel. */
export function buildAdjustmentSummaryLines(input: {
  memberAdjustments: MemberAdjustmentRow[];
  familyMembers: FamilyMemberRow[];
  ingredientCatalog: Map<string, IngredientCatalogEntry>;
  unitsById: Map<string, UnitCatalogEntry>;
  servings: number;
  baseIngredientId: string;
  batchAmount: number | null | undefined;
  batchUnitId: string | null | undefined;
  memberPortions?: MemberPortionInput[];
  audienceMemberIds: string[];
  batchScaleFactor?: number;
}): AdjustmentSummaryLine[] {
  const sortedMembers = getSortedFamilyMembers(input.familyMembers);
  const memberById = new Map(sortedMembers.map((member) => [member.id, member]));
  const resolutionInput: IngredientShareResolutionInput = {
    baseIngredientId: input.baseIngredientId,
    batchAmount: input.batchAmount,
    batchUnitId: input.batchUnitId,
    memberAdjustments: input.memberAdjustments,
    servings: input.servings,
    batchScaleFactor: input.batchScaleFactor,
    familyMembers: input.familyMembers,
    audienceMemberIds: input.audienceMemberIds,
    memberPortions: input.memberPortions,
  };

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

      const portionBadgeLabel = formatPortionMultiplierBadgeLabel(
        getMemberPortionMultiplier(adjustment.familyMemberId, input.memberPortions),
      );

      if (adjustment.kind === "SKIP") {
        return {
          familyMemberId: adjustment.familyMemberId,
          personLabel,
          kind: "SKIP",
          detail: "Not in their portion",
          portionBadgeLabel,
          adjustmentBadgeLabel: "Skipped",
        };
      }

      const consumable = resolveIngredientShareForMember(
        resolutionInput,
        adjustment.familyMemberId,
      );
      const ingredientLabel = getIngredientCatalogLabel(
        consumable?.ingredientId ?? adjustment.ingredientId,
        input.ingredientCatalog,
      );
      const amountLabel = formatResolvedAmountLabel(
        consumable?.amount ?? adjustment.amount,
        consumable?.unitId ?? adjustment.unitId ?? input.batchUnitId,
        input.unitsById,
      );

      return {
        familyMemberId: adjustment.familyMemberId,
        personLabel,
        kind: "MODIFY",
        detail: `${ingredientLabel}${amountLabel ? ` ${amountLabel}` : ""}`,
        portionBadgeLabel,
        adjustmentBadgeLabel: "Custom",
      };
    });
}

/** Default MODIFY amount for one audience member (batch ÷ servings × portion multiplier). */
export function getDefaultModifyAmountForMember(input: {
  batchAmount: number;
  servings: number;
  familyMemberId: string;
  memberPortions?: MemberPortionInput[];
}): number | null {
  return getDefaultPerPersonAmountForMember(
    input.batchAmount,
    input.servings,
    getMemberPortionMultiplier(input.familyMemberId, input.memberPortions),
  );
}

/** Default MODIFY adjustment fields when adding a new person row. */
export function buildDefaultModifyAdjustment(input: {
  familyMemberId: string;
  baseIngredientId: string;
  baseAmount: number;
  baseUnitId: string;
  servings: number;
  memberPortions?: MemberPortionInput[];
  /** @deprecated Prefer memberPortions; kept for callers passing multiplier directly. */
  portionMultiplier?: number;
}): MemberAdjustmentRow {
  const multiplier =
    input.portionMultiplier ??
    getMemberPortionMultiplier(input.familyMemberId, input.memberPortions);
  return {
    familyMemberId: input.familyMemberId,
    kind: "MODIFY",
    ingredientId: input.baseIngredientId,
    amount: getDefaultPerPersonAmountForMember(
      input.baseAmount,
      input.servings,
      multiplier,
    ),
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
    batchScaleFactor,
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
  batchScaleFactor?: number;
}): number | null {
  const batchScaleFactor = input.batchScaleFactor ?? 1;
  if (input.resolved.kind === "modify" && input.resolved.amount != null) {
    // Explicit MODIFY amounts scale with the row (matches instruction badge math).
    return input.resolved.amount * batchScaleFactor;
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
