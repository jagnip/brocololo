import { calculateServingScalingFactor } from "@/lib/recipes/helpers";
import { getIngredientDisplayName } from "@/lib/ingredients/format";
import { GroceryItem } from "@/types/groceries";

export type PlanSlotData = {
  recipe: {
    name: string;
    servings: number;
    servingMultiplierForNelson: number;
    ingredients: Array<{
      ingredient: {
        id: string;
        name: string;
        brand?: string | null;
        descriptor?: string | null;
        icon: string | null;
        supermarketUrl: string | null;
        unitConversions: Array<{ unitId: string; gramsPerUnit: number }>;
        category: { name: string; sortOrder: number };
      };
      unit: { id: string; name: string } | null;
      amount: number | null;
    }>;
  } | null;
};

type ScaledIngredient = {
  ingredientId: string;
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

/**
 * Phase A: Scale each ingredient amount for 2 people,
 * producing a flat list with IDs for aggregation.
 */
function scaleIngredients(slots: PlanSlotData[]): ScaledIngredient[] {
  return slots.flatMap((slot) => {
    if (!slot.recipe) return [];

    const { servingScalingFactor } = calculateServingScalingFactor(
      2,
      slot.recipe.servings,
      slot.recipe.servingMultiplierForNelson,
    );

    return slot.recipe.ingredients.map((ri) => {
      const unit = ri.unit;
      const conversion =
        unit == null
          ? null
          : ri.ingredient.unitConversions.find((uc) => uc.unitId === unit.id);

      return {
        ingredientId: ri.ingredient.id,
        ingredientName: getIngredientDisplayName(
          ri.ingredient.name,
          ri.ingredient.brand ?? null,
          ri.ingredient.descriptor ?? null,
        ),
        ingredientIcon: ri.ingredient.icon,
        supermarketUrl: ri.ingredient.supermarketUrl,
        unitId: unit?.id ?? null,
        unitName: unit?.name ?? null,
        // Unitless items are always non-quantified in grocery output.
        amount:
          ri.amount !== null && unit != null
            ? ri.amount * servingScalingFactor
            : null,
        recipeName: slot.recipe!.name,
        gramsPerUnit: conversion?.gramsPerUnit ?? null,
        categoryName: ri.ingredient.category.name,
        categorySortOrder: ri.ingredient.category.sortOrder,
      };
    });
  });
}

/**
 * Phase B: Aggregate scaled items by ingredient.
 * Same unit → sum amounts.
 * Different units → convert to grams if all conversions exist.
 * Null amounts stay as single un-batched lines.
 */
function aggregateIngredients(items: ScaledIngredient[]): GroceryItem[] {
  const byIngredient = new Map<string, ScaledIngredient[]>();
  for (const item of items) {
    const group = byIngredient.get(item.ingredientId) ?? [];
    group.push(item);
    byIngredient.set(item.ingredientId, group);
  }

  const result: GroceryItem[] = [];

  for (const [, group] of byIngredient) {
    const nullItems = group.filter((i) => i.amount === null);
    const quantifiedItems = group.filter((i) => i.amount !== null);

    // Null-amount items: one line per ingredient, collect recipe names
    if (nullItems.length > 0) {
      result.push({
        ingredientName: nullItems[0].ingredientName,
        ingredientIcon: nullItems[0].ingredientIcon,
        supermarketUrl: nullItems[0].supermarketUrl,
        amount: null,
        unitName: nullItems[0].unitName,
        recipeNames: [...new Set(nullItems.map((i) => i.recipeName))],
        categoryName: nullItems[0].categoryName,
        categorySortOrder: nullItems[0].categorySortOrder,
      });
    }

    if (quantifiedItems.length === 0) continue;

    // Group quantified items by unitId
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
      // Single unit: sum amounts directly
      const unitGroup = quantifiedItems;
      result.push({
        ingredientName: unitGroup[0].ingredientName,
        ingredientIcon: unitGroup[0].ingredientIcon,
        supermarketUrl: unitGroup[0].supermarketUrl,
        amount: unitGroup.reduce((sum, i) => sum + i.amount!, 0),
        unitName: unitGroup[0].unitName,
        recipeNames: [...new Set(unitGroup.map((i) => i.recipeName))],
        categoryName: unitGroup[0].categoryName,
        categorySortOrder: unitGroup[0].categorySortOrder,
      });
    } else {
      // Multiple units: try converting all to grams
      const allConvertible = quantifiedItems.every((i) => i.gramsPerUnit !== null);

      if (allConvertible) {
        const totalGrams = quantifiedItems.reduce(
          (sum, i) => sum + i.amount! * i.gramsPerUnit!,
          0,
        );
        result.push({
          ingredientName: quantifiedItems[0].ingredientName,
          ingredientIcon: quantifiedItems[0].ingredientIcon,
          supermarketUrl: quantifiedItems[0].supermarketUrl,
          amount: totalGrams,
          unitName: "g",
          recipeNames: [...new Set(quantifiedItems.map((i) => i.recipeName))],
          categoryName: quantifiedItems[0].categoryName,
          categorySortOrder: quantifiedItems[0].categorySortOrder,
        });
      } else {
        // Can't convert all: output each unit group separately
        for (const [, unitGroup] of byUnit) {
          result.push({
            ingredientName: unitGroup[0].ingredientName,
            ingredientIcon: unitGroup[0].ingredientIcon,
            supermarketUrl: unitGroup[0].supermarketUrl,
            amount: unitGroup.reduce((sum, i) => sum + i.amount!, 0),
            unitName: unitGroup[0].unitName,
            recipeNames: [...new Set(unitGroup.map((i) => i.recipeName))],
            categoryName: unitGroup[0].categoryName,
            categorySortOrder: unitGroup[0].categorySortOrder,
          });
        }
      }
    }
  }

  return result.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
}

export function transformPlanToGroceryItems(slots: PlanSlotData[]): GroceryItem[] {
  const scaled = scaleIngredients(slots);
  const aggregated = aggregateIngredients(scaled);

  return aggregated;
}

export function formatAmount(amount: number): string {
  return Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2).replace(/\.?0+$/, "");
}