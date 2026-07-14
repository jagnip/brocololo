import { filterSlotsForGroceryGeneration } from "@/lib/groceries/generation-options";
import type { GroceryGenerationExclusions } from "@/lib/groceries/generation-options";
import { getIngredientDisplayName } from "@/lib/ingredients/format";
import {
  getUnitDisplayName,
  isPieceUnit,
} from "@/lib/recipes/helpers";
import type { MemberAdjustmentRow } from "@/lib/recipes/resolve-ingredient-lines";
import { resolveRecipeSlotScaledConsumables } from "@/lib/planner/resolve-slot-ingredients";
import { ShoppingListGeneratedLine } from "@/types/groceries";

type GroceryIngredientMeta = {
  id: string;
  name: string;
  brand?: string | null;
  descriptor?: string | null;
  icon: string | null;
  supermarketUrl: string | null;
  unitConversions: Array<{ unitId: string; gramsPerUnit: number }>;
  category: { id: string; name: string; sortOrder: number };
};

export type PlanSlotData = {
  recipeId?: string | null;
  cookingFamilyMemberIds?: string[];
  familyMembers?: Array<{ id: string; isSelf: boolean }>;
  recipe: {
    name: string;
    servings: number;
    audienceMembers?: Array<{ familyMemberId: string }>;
    memberPortions?: Array<{ familyMemberId: string; multiplier: number }>;
    ingredients: Array<{
      id: string;
      ingredientId: string;
      amount: number | null;
      additionalInfo: string | null;
      memberAdjustments?: MemberAdjustmentRow[];
      ingredient: GroceryIngredientMeta;
      unit: { id: string; name: string } | null;
    }>;
  } | null;
  customName?: string | null;
  customIngredients?: Array<{
    ingredient: GroceryIngredientMeta;
    unit: { id: string; name: string } | null;
    amount: number | null;
  }>;
};

type ScaledIngredient = {
  ingredientId: string;
  ingredientCategoryId: string;
  ingredientName: string;
  ingredientIcon: string | null;
  supermarketUrl: string | null;
  unitId: string | null;
  unitName: string | null;
  amount: number | null;
  recipeName: string;
  gramsPerUnit: number | null;
  categoryName: string;
  categorySortOrder: number;
};

function buildIngredientCatalogForSlot(
  recipe: NonNullable<PlanSlotData["recipe"]>,
): Map<string, GroceryIngredientMeta> {
  const catalog = new Map<string, GroceryIngredientMeta>();
  for (const row of recipe.ingredients) {
    catalog.set(row.ingredient.id, row.ingredient);
    for (const adjustment of row.memberAdjustments ?? []) {
      const substitute = (
        adjustment as MemberAdjustmentRow & {
          ingredient?: GroceryIngredientMeta | null;
        }
      ).ingredient;
      if (substitute) {
        catalog.set(substitute.id, substitute);
      }
    }
  }
  return catalog;
}

function toScaledIngredient(input: {
  ingredientId: string;
  unitId: string;
  amount: number;
  recipeName: string;
  catalog: Map<string, GroceryIngredientMeta>;
  unitsById: Map<string, { id: string; name: string }>;
}): ScaledIngredient | null {
  const ingredient = input.catalog.get(input.ingredientId);
  if (!ingredient) {
    return null;
  }
  const unit = input.unitsById.get(input.unitId);
  const conversion = ingredient.unitConversions.find(
    (entry) => entry.unitId === input.unitId,
  );

  return {
    ingredientId: ingredient.id,
    ingredientCategoryId: ingredient.category.id,
    ingredientName: getIngredientDisplayName(
      ingredient.name,
      ingredient.brand ?? null,
      ingredient.descriptor ?? null,
    ),
    ingredientIcon: ingredient.icon,
    supermarketUrl: ingredient.supermarketUrl,
    unitId: input.unitId,
    unitName: unit?.name ?? null,
    amount: input.amount,
    recipeName: input.recipeName,
    gramsPerUnit: conversion?.gramsPerUnit ?? null,
    categoryName: ingredient.category.name,
    categorySortOrder: ingredient.category.sortOrder,
  };
}

function mapCustomIngredients(slot: PlanSlotData): ScaledIngredient[] {
  if (!slot.customName || !slot.customIngredients?.length) {
    return [];
  }

  return slot.customIngredients.flatMap((row) => {
    const unit = row.unit;
    const conversion =
      unit == null
        ? null
        : row.ingredient.unitConversions.find((uc) => uc.unitId === unit.id);

    if (row.amount == null || unit == null) {
      return [];
    }

    return [
      {
        ingredientId: row.ingredient.id,
        ingredientCategoryId: row.ingredient.category.id,
        ingredientName: getIngredientDisplayName(
          row.ingredient.name,
          row.ingredient.brand ?? null,
          row.ingredient.descriptor ?? null,
        ),
        ingredientIcon: row.ingredient.icon,
        supermarketUrl: row.ingredient.supermarketUrl,
        unitId: unit.id,
        unitName: unit.name,
        amount: row.amount,
        recipeName: slot.customName!,
        gramsPerUnit: conversion?.gramsPerUnit ?? null,
        categoryName: row.ingredient.category.name,
        categorySortOrder: row.ingredient.category.sortOrder,
      },
    ];
  });
}

/**
 * Phase A: resolve per-eater ingredient lines (MODIFY/SKIP aware),
 * producing a flat list with IDs for aggregation.
 */
function scaleIngredients(slots: PlanSlotData[]): ScaledIngredient[] {
  return slots.flatMap((slot) => {
    const recipeItems = (() => {
      if (!slot.recipe) return [];

      const catalog = buildIngredientCatalogForSlot(slot.recipe);

      const unitsById = new Map<string, { id: string; name: string }>();
      for (const row of slot.recipe.ingredients) {
        if (row.unit) {
          unitsById.set(row.unit.id, row.unit);
        }
        for (const adjustment of row.memberAdjustments ?? []) {
          const adjustmentUnit = (
            adjustment as MemberAdjustmentRow & {
              unit?: { id: string; name: string } | null;
            }
          ).unit;
          if (adjustmentUnit) {
            unitsById.set(adjustmentUnit.id, adjustmentUnit);
          }
        }
      }

      const consumables = resolveRecipeSlotScaledConsumables(slot);

      return consumables.flatMap((consumable) => {
        const scaled = toScaledIngredient({
          ingredientId: consumable.ingredientId,
          unitId: consumable.unitId,
          amount: consumable.amount,
          recipeName: slot.recipe!.name,
          catalog,
          unitsById,
        });
        return scaled ? [scaled] : [];
      });
    })();

    return [...recipeItems, ...mapCustomIngredients(slot)];
  });
}

/**
 * Phase B: Aggregate scaled items by ingredient.
 * Same unit → sum amounts.
 * Different units → convert to grams if all conversions exist.
 * Null amounts stay as single un-batched lines.
 */
function aggregateIngredients(
  items: ScaledIngredient[],
): ShoppingListGeneratedLine[] {
  const byIngredient = new Map<string, ScaledIngredient[]>();
  for (const item of items) {
    const group = byIngredient.get(item.ingredientId) ?? [];
    group.push(item);
    byIngredient.set(item.ingredientId, group);
  }

  const result: ShoppingListGeneratedLine[] = [];

  for (const [, group] of byIngredient) {
    const nullItems = group.filter((i) => i.amount === null);
    const quantifiedItems = group.filter((i) => i.amount !== null);

    if (nullItems.length > 0) {
      const first = nullItems[0]!;
      result.push({
        ingredientName: first.ingredientName,
        ingredientIcon: first.ingredientIcon,
        supermarketUrl: first.supermarketUrl,
        amount: null,
        unitName: first.unitName,
        recipeNames: [...new Set(nullItems.map((i) => i.recipeName))],
        categoryName: first.categoryName,
        categorySortOrder: first.categorySortOrder,
        ingredientId: first.ingredientId,
        ingredientCategoryId: first.ingredientCategoryId,
        unitId: first.unitId,
      });
    }

    if (quantifiedItems.length === 0) continue;

    const byUnit = new Map<string, ScaledIngredient[]>();
    for (const item of quantifiedItems) {
      if (!item.unitId) {
        continue;
      }
      const unitGroup = byUnit.get(item.unitId) ?? [];
      unitGroup.push(item);
      byUnit.set(item.unitId, unitGroup);
    }

    if (byUnit.size === 1) {
      const unitGroup = quantifiedItems;
      const first = unitGroup[0]!;
      result.push({
        ingredientName: first.ingredientName,
        ingredientIcon: first.ingredientIcon,
        supermarketUrl: first.supermarketUrl,
        amount: unitGroup.reduce((sum, i) => sum + i.amount!, 0),
        unitName: first.unitName,
        recipeNames: [...new Set(unitGroup.map((i) => i.recipeName))],
        categoryName: first.categoryName,
        categorySortOrder: first.categorySortOrder,
        ingredientId: first.ingredientId,
        ingredientCategoryId: first.ingredientCategoryId,
        unitId: first.unitId,
      });
    } else {
      const allConvertible = quantifiedItems.every((i) => i.gramsPerUnit !== null);

      if (allConvertible) {
        const totalGrams = quantifiedItems.reduce(
          (sum, i) => sum + i.amount! * i.gramsPerUnit!,
          0,
        );
        const first = quantifiedItems[0]!;
        result.push({
          ingredientName: first.ingredientName,
          ingredientIcon: first.ingredientIcon,
          supermarketUrl: first.supermarketUrl,
          amount: totalGrams,
          unitName: "g",
          recipeNames: [...new Set(quantifiedItems.map((i) => i.recipeName))],
          categoryName: first.categoryName,
          categorySortOrder: first.categorySortOrder,
          ingredientId: first.ingredientId,
          ingredientCategoryId: first.ingredientCategoryId,
          unitId: null,
        });
      } else {
        for (const [, unitGroup] of byUnit) {
          const first = unitGroup[0]!;
          result.push({
            ingredientName: first.ingredientName,
            ingredientIcon: first.ingredientIcon,
            supermarketUrl: first.supermarketUrl,
            amount: unitGroup.reduce((sum, i) => sum + i.amount!, 0),
            unitName: first.unitName,
            recipeNames: [...new Set(unitGroup.map((i) => i.recipeName))],
            categoryName: first.categoryName,
            categorySortOrder: first.categorySortOrder,
            ingredientId: first.ingredientId,
            ingredientCategoryId: first.ingredientCategoryId,
            unitId: first.unitId,
          });
        }
      }
    }
  }

  return result.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
}

export function transformPlanToShoppingListRows(
  slots: PlanSlotData[],
  exclusions: GroceryGenerationExclusions = {
    excludedRecipeIds: [],
    excludedCustomMealNames: [],
  },
): ShoppingListGeneratedLine[] {
  const eligibleSlots = filterSlotsForGroceryGeneration(slots, exclusions);
  const scaled = scaleIngredients(eligibleSlots);
  return aggregateIngredients(scaled);
}

export function formatAmount(amount: number): string {
  return Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2).replace(/\.?0+$/, "");
}

/** Read-only grocery list amount line; hides piece/pieces (matches recipe instruction badges). */
export function formatGroceryViewAmountLabel(input: {
  amount: number | null;
  unitName: string | null;
  unitNamePlural?: string | null;
}): string {
  const displayUnit = getUnitDisplayName({
    amount: input.amount,
    unitName: input.unitName,
    unitNamePlural: input.unitNamePlural,
  });

  if (input.amount === null) {
    return displayUnit || "";
  }

  const amountText = formatAmount(input.amount);
  if (isPieceUnit(displayUnit)) {
    return amountText;
  }

  return `${amountText} ${displayUnit}`.trim();
}
