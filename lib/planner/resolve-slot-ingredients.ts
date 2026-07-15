import { getIngredientDisplayName } from "@/lib/ingredients/format";
import type { PlanSlotData } from "@/lib/groceries/helpers";
import {
  resolveRecipeIngredientRowsForMember,
  type ConsumableIngredientLine,
} from "@/lib/recipes/ingredient-adjustments";
import type { MemberAdjustmentRow } from "@/lib/recipes/resolve-ingredient-lines";
import {
  formatIngredientAmount,
  getUnitDisplayName,
  isPieceUnit,
} from "@/lib/recipes/helpers";
import type { PlanCustomMealIngredient } from "@/types/planner";
import type { RecipeType } from "@/types/recipe";

/** Max ingredient lines shown on a plan slot card before truncation. */
export const SLOT_INGREDIENT_SUMMARY_MAX_LINES = 4;

export type FamilyMemberRef = {
  id: string;
  isSelf: boolean;
};

export type RecipeSlotIngredientInput = {
  id: string;
  ingredientId: string;
  amount: number | null;
  additionalInfo: string | null;
  unit?: { id: string; name?: string; namePlural?: string | null } | null;
  unitId?: string | null;
  memberAdjustments?: MemberAdjustmentRow[];
  ingredient?: {
    id: string;
    name: string;
    brand?: string | null;
    descriptor?: string | null;
  };
};

export type RecipeSlotResolutionInput = {
  servings: number;
  audienceMembers?: Array<{ familyMemberId: string }>;
  memberPortions?: Array<{ familyMemberId: string; multiplier: number }>;
  ingredients: RecipeSlotIngredientInput[];
};

export type AggregatedIngredientLine = {
  ingredientId: string;
  unitId: string;
  amount: number;
};

export type IngredientDisplayCatalogEntry = {
  id: string;
  name: string;
  brand?: string | null;
  descriptor?: string | null;
};

export type IngredientUnitCatalogEntry = {
  name: string;
  namePlural?: string | null;
};

/** Resolve cooking audience for a slot — empty means nobody eats (zero groceries). */
export function getSlotCookingFamilyMemberIds(params: {
  cookingFamilyMemberIds?: string[];
  familyMembers: FamilyMemberRef[];
  /** @deprecated Recipe audience removed — ignored when slot audience is empty. */
  recipeAudienceMemberIds?: string[];
}): string[] {
  if (params.cookingFamilyMemberIds && params.cookingFamilyMemberIds.length > 0) {
    return params.cookingFamilyMemberIds;
  }
  return [];
}

/** Sum consumable lines by ingredient + unit (planner + groceries aggregation). */
export function aggregateConsumableIngredientLines(
  lines: ConsumableIngredientLine[],
): AggregatedIngredientLine[] {
  const byKey = new Map<string, AggregatedIngredientLine>();

  for (const line of lines) {
    const key = `${line.ingredientId}:${line.unitId}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.amount = Math.round((existing.amount + line.amount) * 1000) / 1000;
      continue;
    }
    byKey.set(key, {
      ingredientId: line.ingredientId,
      unitId: line.unitId,
      amount: line.amount,
    });
  }

  return [...byKey.values()].sort((a, b) =>
    a.ingredientId.localeCompare(b.ingredientId),
  );
}

/**
 * Resolve aggregated ingredient amounts for all eaters on a recipe slot.
 * MODIFY/SKIP aware — same pipeline as groceries.
 */
export function resolveRecipeSlotAggregatedIngredients(params: {
  recipe: RecipeSlotResolutionInput;
  cookingFamilyMemberIds?: string[];
  familyMembers: FamilyMemberRef[];
}): AggregatedIngredientLine[] {
  const memberPortions = params.familyMembers.map((member) => ({
    familyMemberId: member.id,
    multiplier: 1,
  }));
  const audienceMemberIds = params.familyMembers.map((member) => member.id);
  const cookingIds = getSlotCookingFamilyMemberIds({
    cookingFamilyMemberIds: params.cookingFamilyMemberIds,
    familyMembers: params.familyMembers,
  });
  const eaters = cookingIds;

  const consumables = eaters.flatMap((familyMemberId) =>
    resolveRecipeIngredientRowsForMember({
      recipeIngredients: params.recipe.ingredients.map((row) => ({
        id: row.id,
        ingredientId: row.ingredientId,
        amount: row.amount,
        unit: row.unit ?? (row.unitId ? { id: row.unitId } : null),
        additionalInfo: row.additionalInfo,
        memberAdjustments: row.memberAdjustments ?? [],
      })),
      familyMemberId,
      recipeServings: params.recipe.servings,
      familyMembers: params.familyMembers,
      memberPortions,
      audienceMemberIds,
      cookingFamilyMemberIds: cookingIds,
    }),
  );

  return aggregateConsumableIngredientLines(consumables);
}

/** Build name lookup from recipe rows (base ingredients only). */
export function buildIngredientDisplayCatalogFromRecipe(
  recipe: RecipeSlotResolutionInput,
  extraCatalog?: Map<string, IngredientDisplayCatalogEntry>,
): Map<string, IngredientDisplayCatalogEntry> {
  const catalog = new Map<string, IngredientDisplayCatalogEntry>(
    extraCatalog ?? [],
  );

  for (const row of recipe.ingredients) {
    if (row.ingredient) {
      catalog.set(row.ingredient.id, {
        id: row.ingredient.id,
        name: row.ingredient.name,
        brand: row.ingredient.brand ?? null,
        descriptor: row.ingredient.descriptor ?? null,
      });
    }
  }

  return catalog;
}

/** Collect unit labels from recipe ingredient rows. */
export function buildUnitCatalogFromRecipe(
  recipe: RecipeSlotResolutionInput,
): Map<string, IngredientUnitCatalogEntry> {
  const unitsById = new Map<string, IngredientUnitCatalogEntry>();

  for (const row of recipe.ingredients) {
    if (row.unit?.id) {
      unitsById.set(row.unit.id, {
        name: row.unit.name ?? "",
        namePlural: row.unit.namePlural ?? null,
      });
    }
  }

  return unitsById;
}

export function getIngredientCatalogLabel(
  ingredientId: string,
  catalog: Map<string, IngredientDisplayCatalogEntry>,
): string {
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

/** Format one aggregated line for planner card display (e.g. "Olive oil 10g"). */
export function formatAggregatedIngredientLine(
  line: AggregatedIngredientLine,
  catalog: Map<string, IngredientDisplayCatalogEntry>,
  unitsById: Map<string, IngredientUnitCatalogEntry>,
): string {
  const ingredientName = getIngredientCatalogLabel(line.ingredientId, catalog);
  const unit = unitsById.get(line.unitId);
  const displayUnit = getUnitDisplayName({
    amount: line.amount,
    unitName: unit?.name ?? null,
    unitNamePlural: unit?.namePlural ?? null,
  });
  const amountText = formatIngredientAmount(line.amount, 2);

  if (isPieceUnit(displayUnit)) {
    return `${ingredientName} ${amountText}`;
  }

  if (!displayUnit) {
    return `${ingredientName} ${amountText}`;
  }

  return `${ingredientName} ${amountText} ${displayUnit}`.trim();
}

export function formatSlotIngredientSummary(
  lines: AggregatedIngredientLine[],
  catalog: Map<string, IngredientDisplayCatalogEntry>,
  unitsById: Map<string, IngredientUnitCatalogEntry>,
  maxLines: number = SLOT_INGREDIENT_SUMMARY_MAX_LINES,
): { visibleLines: string[]; remainingCount: number } {
  const formatted = lines.map((line) =>
    formatAggregatedIngredientLine(line, catalog, unitsById),
  );
  const visibleLines = formatted.slice(0, maxLines);
  const remainingCount = Math.max(0, formatted.length - maxLines);
  return { visibleLines, remainingCount };
}

/** Map aggregated lines to editable dialog rows. */
export function aggregatedLinesToEditableRows(
  lines: AggregatedIngredientLine[],
): Array<{ ingredientId: string; unitId: string; amount: number }> {
  return lines.map((line) => ({
    ingredientId: line.ingredientId,
    unitId: line.unitId,
    amount: line.amount,
  }));
}

/** Custom plan ideas: show stored ingredients as-is (no per-person resolution). */
export function resolveCustomMealAggregatedIngredients(
  ingredients: PlanCustomMealIngredient[],
): AggregatedIngredientLine[] {
  return ingredients
    .filter(
      (row): row is { ingredientId: string; unitId: string; amount: number } =>
        row.ingredientId != null &&
        row.unitId != null &&
        row.amount != null &&
        row.amount > 0,
    )
    .map((row) => ({
      ingredientId: row.ingredientId,
      unitId: row.unitId,
      amount: row.amount,
    }));
}

export function recipeTypeToResolutionInput(
  recipe: RecipeType,
): RecipeSlotResolutionInput {
  return {
    servings: recipe.servings,
    audienceMembers: recipe.audienceMembers,
    memberPortions: recipe.memberPortions,
    ingredients: recipe.ingredients.map((row) => ({
      id: row.id,
      ingredientId: row.ingredientId,
      amount: row.amount,
      additionalInfo: row.additionalInfo,
      unit: row.unit,
      unitId: row.unitId,
      memberAdjustments: row.memberAdjustments,
      ingredient: row.ingredient,
    })),
  };
}

/** High-level display summary for planner slot cards. */
export function getPlannerSlotIngredientSummary(params: {
  recipe: RecipeType | null;
  customMealIngredients?: PlanCustomMealIngredient[];
  cookingFamilyMemberIds?: string[];
  familyMembers: FamilyMemberRef[];
  ingredientOptions: Array<{
    id: string;
    name: string;
    brand?: string | null;
    descriptor?: string | null;
    unitConversions: Array<{
      unitId: string;
      unitName: string;
      unitNamePlural?: string | null;
    }>;
  }>;
}): { visibleLines: string[]; remainingCount: number } {
  const lines = resolvePlannerSlotAggregatedIngredients({
    recipe: params.recipe,
    customMealIngredients: params.customMealIngredients,
    cookingFamilyMemberIds: params.cookingFamilyMemberIds,
    familyMembers: params.familyMembers,
  });

  const catalog = buildPlannerIngredientDisplayCatalog({
    recipe: params.recipe,
    ingredientOptions: params.ingredientOptions,
  });

  const unitsById = buildUnitCatalogFromIngredientOptions(
    params.ingredientOptions,
  );
  if (params.recipe) {
    const recipeUnits = buildUnitCatalogFromRecipe(
      recipeTypeToResolutionInput(params.recipe),
    );
    for (const [unitId, unit] of recipeUnits) {
      unitsById.set(unitId, unit);
    }
  }

  return formatSlotIngredientSummary(lines, catalog, unitsById);
}

/** Resolved rows for meal dialog when a recipe is selected or reopened. */
export function getPlannerRecipeDialogIngredientRows(params: {
  recipe: RecipeType;
  cookingFamilyMemberIds?: string[];
  familyMembers: FamilyMemberRef[];
}): Array<{ ingredientId: string; unitId: string; amount: number }> {
  const lines = resolveRecipeSlotAggregatedIngredients({
    recipe: recipeTypeToResolutionInput(params.recipe),
    cookingFamilyMemberIds: params.cookingFamilyMemberIds,
    familyMembers: params.familyMembers,
  });
  return aggregatedLinesToEditableRows(lines);
}

/** High-level resolver for planner slot cards and meal dialog prefill. */
export function resolvePlannerSlotAggregatedIngredients(params: {
  recipe: RecipeType | null;
  customMealIngredients?: PlanCustomMealIngredient[];
  cookingFamilyMemberIds?: string[];
  familyMembers: FamilyMemberRef[];
}): AggregatedIngredientLine[] {
  if (params.recipe) {
    return resolveRecipeSlotAggregatedIngredients({
      recipe: recipeTypeToResolutionInput(params.recipe),
      cookingFamilyMemberIds: params.cookingFamilyMemberIds,
      familyMembers: params.familyMembers,
    });
  }

  if (params.customMealIngredients?.length) {
    return resolveCustomMealAggregatedIngredients(params.customMealIngredients);
  }

  return [];
}

/** Groceries: resolve scaled consumables for one recipe slot (per-eater, not aggregated). */
export function resolveRecipeSlotScaledConsumables(
  slot: PlanSlotData,
): ConsumableIngredientLine[] {
  if (!slot.recipe) {
    return [];
  }

  const familyMembers = slot.familyMembers ?? [];
  const memberPortions = familyMembers.map((member) => ({
    familyMemberId: member.id,
    multiplier: 1,
  }));
  const audienceMemberIds = familyMembers.map((member) => member.id);
  const cookingIds = getSlotCookingFamilyMemberIds({
    cookingFamilyMemberIds: slot.cookingFamilyMemberIds,
    familyMembers,
  });
  const eaters = cookingIds;

  return eaters.flatMap((familyMemberId) =>
    resolveRecipeIngredientRowsForMember({
      recipeIngredients: slot.recipe!.ingredients.map((row) => ({
        id: row.id,
        ingredientId: row.ingredientId,
        amount: row.amount,
        unit: row.unit,
        additionalInfo: row.additionalInfo,
        memberAdjustments: row.memberAdjustments ?? [],
      })),
      familyMemberId,
      recipeServings: slot.recipe!.servings,
      familyMembers,
      memberPortions,
      audienceMemberIds,
      cookingFamilyMemberIds: cookingIds,
    }),
  );
}

/** Build unit catalog from ingredient options (for MODIFY substitute units). */
export function buildUnitCatalogFromIngredientOptions(
  ingredientOptions: Array<{
    unitConversions: Array<{
      unitId: string;
      unitName: string;
      unitNamePlural?: string | null;
    }>;
  }>,
): Map<string, IngredientUnitCatalogEntry> {
  const unitsById = new Map<string, IngredientUnitCatalogEntry>();

  for (const ingredient of ingredientOptions) {
    for (const conversion of ingredient.unitConversions) {
      unitsById.set(conversion.unitId, {
        name: conversion.unitName,
        namePlural: conversion.unitNamePlural ?? null,
      });
    }
  }

  return unitsById;
}

/** Merge recipe + ingredient-option catalogs for display labels. */
export function buildPlannerIngredientDisplayCatalog(params: {
  recipe: RecipeType | null;
  ingredientOptions: Array<{
    id: string;
    name: string;
    brand?: string | null;
    descriptor?: string | null;
  }>;
}): Map<string, IngredientDisplayCatalogEntry> {
  const catalog = new Map<string, IngredientDisplayCatalogEntry>();

  for (const option of params.ingredientOptions) {
    catalog.set(option.id, {
      id: option.id,
      name: option.name,
      brand: option.brand ?? null,
      descriptor: option.descriptor ?? null,
    });
  }

  if (params.recipe) {
    return buildIngredientDisplayCatalogFromRecipe(
      recipeTypeToResolutionInput(params.recipe),
      catalog,
    );
  }

  return catalog;
}
