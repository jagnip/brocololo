import type { RecipeForNutritionCalculation } from "@/lib/recipes/helpers";
import type { RecipeType } from "@/types/recipe";
import type { IngredientType } from "@/types/ingredient";
import type { CreateRecipeFormValues } from "@/lib/validations/recipe";
import type { FamilyMemberRow } from "@/lib/db/family-members";

type FormIngredientRow = CreateRecipeFormValues["ingredients"][number];

/** Coerce live form portions for preview; invalid yields NaN so calculateNutritionPerServing returns zeros. */
function coercePreviewServings(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

/** `z.input` treats `z.coerce.number()` fields as `unknown` — normalize for draft rows. */
function coerceIngredientRowPosition(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.trunc(n);
}

/**
 * Maps editor form slice + ingredient catalog into the shape used by calculateNutritionPerServing.
 * Skips placeholder rows without ingredientId (same idea as submit sanitization).
 * Household portion multipliers come from `familyMembers`, not the recipe form.
 */
export function buildDraftRecipeForNutrition(
  servings: unknown,
  rows: FormIngredientRow[] | undefined,
  catalog: IngredientType[],
  familyMembers: FamilyMemberRow[],
): RecipeForNutritionCalculation {
  const byId = new Map(catalog.map((ingredient) => [ingredient.id, ingredient]));

  const ingredients: RecipeForNutritionCalculation["ingredients"] = [];

  for (const row of rows ?? []) {
    if (!row.ingredientId?.trim()) continue;

    const catalogIngredient = byId.get(row.ingredientId);
    if (!catalogIngredient) continue;

    const unitId = row.unitId ?? null;
    if (unitId == null || row.amount == null) {
      continue;
    }

    const conversion = catalogIngredient.unitConversions.find(
      (unitConversion) => unitConversion.unitId === unitId,
    );
    if (!conversion) continue;

    ingredients.push({
      id: row.tempIngredientKey,
      recipeId: "draft",
      groupId: null,
      position: coerceIngredientRowPosition(row.position),
      ingredientId: catalogIngredient.id,
      unitId,
      amount: row.amount,
      appliesToEveryone: true,
      additionalInfo: row.additionalInfo ?? null,
      memberAdjustments: (row.memberAdjustments ?? []).map((adjustment) => ({
        familyMemberId: adjustment.familyMemberId,
        kind: adjustment.kind,
        ingredientId: adjustment.ingredientId ?? null,
        amount: adjustment.amount ?? null,
        unitId: adjustment.unitId ?? null,
        additionalInfo: adjustment.additionalInfo ?? null,
      })),
      group: null,
      ingredient: catalogIngredient,
      unit: {
        id: conversion.unit.id,
        name: conversion.unit.name,
        namePlural: conversion.unit.namePlural ?? null,
      },
    } as RecipeType["ingredients"][number]);
  }

  return {
    servings: coercePreviewServings(servings),
    audienceMembers: familyMembers.map((member) => ({
      recipeId: "draft",
      familyMemberId: member.id,
    })),
    memberPortions: [],
    ingredients,
  };
}
