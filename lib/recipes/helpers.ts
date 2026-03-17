import type { RecipeType } from "@/types/recipe";
import type { IngredientType } from "@/types/ingredient";
import type { UpdateRecipeFormValues } from "@/lib/validations/recipe";

// Shape of a unitConversion entry after enriching with the unit name
export type UnitConversionWithName = {
  unitId: string;
  gramsPerUnit: number;
  unit: { id: string; name: string; namePlural?: string | null };
};

export type IngredientDisplayResult = {
  displayAmount: string | null;
  rawAmount: number | null;
  rawAmountInGrams: number | null;
  selectedUnitGramsPerUnit: number | null;
  displayUnitName: string;
  displayUnitNamePlural: string | null;
  canConvert: boolean;
  availableUnits: UnitConversionWithName[];
};

/**
 * Formats ingredient amounts for UI labels and badges.
 * Whole numbers are shown without a decimal suffix.
 */
export function formatIngredientAmount(
  amount: number,
  maxFractionDigits = 2,
): string {
  const rounded = Number(amount.toFixed(maxFractionDigits));
  // Normalize -0 into 0 so UI labels never show a negative zero.
  if (Object.is(rounded, -0)) {
    return "0";
  }
  return rounded.toString();
}

export function getUnitDisplayName(input: {
  amount: number | null | undefined;
  unitName: string | null | undefined;
  unitNamePlural?: string | null | undefined;
}): string {
  const singular = input.unitName?.trim() ?? "";
  if (singular.length === 0) {
    return "";
  }
  if (input.amount == null || input.amount <= 1) {
    return singular;
  }
  // Fallback to singular keeps abbreviations/custom units safe by default.
  const plural = input.unitNamePlural?.trim();
  return plural && plural.length > 0 ? plural : singular;
}

export function formatIngredientLabel(input: {
  amountText?: string | null;
  unitName?: string | null;
  ingredientName: string;
  additionalInfo?: string | null;
}): string {
  const amountText = input.amountText?.trim();
  const normalizedUnitName = input.unitName?.trim() ?? "";
  // Preserve provided unit token whenever it exists.
  const shouldRenderUnit = normalizedUnitName.length > 0;
  const base = [
    amountText && amountText.length > 0 ? amountText : null,
    shouldRenderUnit ? normalizedUnitName : null,
    input.ingredientName,
  ]
    .filter((token): token is string => Boolean(token))
    .join(" ");
  return input.additionalInfo ? `${base} (${input.additionalInfo})` : base;
}

function normalizeUnitToken(unitName: string | null | undefined): string {
  return (unitName ?? "").trim().toLowerCase();
}

export function isPieceUnit(unitName: string | null | undefined): boolean {
  const normalized = normalizeUnitToken(unitName);
  return normalized === "piece" || normalized === "pieces";
}

export function isGramUnit(unitName: string | null | undefined): boolean {
  const normalized = normalizeUnitToken(unitName);
  return normalized === "g" || normalized === "gram" || normalized === "grams";
}

/**
 * Convert an amount from one unit to another using their grams-per-unit rates.
 * E.g., 2 tbsp (15g/tbsp) → cups (240g/cup) = 2 * (15 / 240) = 0.125 cups
 */
export function convertAmount(
  amount: number,
  fromGramsPerUnit: number,
  toGramsPerUnit: number,
): number {
  return amount * (fromGramsPerUnit / toGramsPerUnit);
}

/**
 * Determines the display amount, unit name, and whether a unit selector
 * should be shown for a given recipe ingredient.
 */
export function getIngredientDisplay(
  amount: number | null,
  originalUnitId: string | null,
  originalUnitName: string | null,
  selectedUnitId: string | null,
  unitConversions: UnitConversionWithName[],
  servingScalingFactor: number,
  calorieScalingFactor: number,
): IngredientDisplayResult {
  if (amount == null || !originalUnitId || !originalUnitName) {
    return {
      displayAmount: null,
      rawAmount: null,
      rawAmountInGrams: null,
      selectedUnitGramsPerUnit: null,
      displayUnitName: "",
      displayUnitNamePlural: null,
      canConvert: false,
      availableUnits: unitConversions,
    };
  }

  const originalConversion = unitConversions.find(
    (uc) => uc.unitId === originalUnitId,
  );

  const canConvert =
    amount != null &&
    originalConversion != null &&
    unitConversions.length > 1;

  let scaled = amount * servingScalingFactor * calorieScalingFactor;
  let displayUnitName = originalUnitName;
  let displayUnitNamePlural: string | null = null;

  const selectedConversion =
    selectedUnitId == null
      ? null
      : unitConversions.find((uc) => uc.unitId === selectedUnitId);

  if (
    canConvert &&
    selectedConversion &&
    selectedUnitId !== originalUnitId
  ) {
    scaled = convertAmount(
      scaled,
      originalConversion!.gramsPerUnit,
      selectedConversion.gramsPerUnit,
    );
    displayUnitName = selectedConversion.unit.name;
    displayUnitNamePlural = selectedConversion.unit.namePlural ?? null;
  } else if (selectedConversion) {
    displayUnitNamePlural = selectedConversion.unit.namePlural ?? null;
  } else {
    const originalSelected = unitConversions.find((uc) => uc.unitId === originalUnitId);
    displayUnitNamePlural = originalSelected?.unit.namePlural ?? null;
  }

  // Keep explicit grams metadata so UI can display selected-amount nutrition
  // without repeating conversion math at call sites.
  const displayConversion = selectedConversion ?? originalConversion ?? null;
  const rawAmountInGrams =
    displayConversion == null ? null : scaled * displayConversion.gramsPerUnit;

  return {
    displayAmount: formatIngredientAmount(scaled, 2),
    rawAmount: scaled,
    rawAmountInGrams,
    selectedUnitGramsPerUnit: displayConversion?.gramsPerUnit ?? null,
    displayUnitName,
    displayUnitNamePlural,
    canConvert,
    availableUnits: unitConversions,
  };
}

//To transform recipefrom to edit recipe form 
export function recipeToFormData(recipe: RecipeType): UpdateRecipeFormValues {
  const ingredientGroups = recipe.ingredientGroups.map((group) => ({
    id: group.id,
    tempGroupKey: group.id,
    name: group.name,
    position: group.position,
  }));
  const ingredientRows = recipe.ingredients.map((ri, index) => ({
    id: ri.id,
    tempIngredientKey: ri.id,
    ingredientId: ri.ingredient.id,
    amount: ri.amount,
    unitId: ri.unit?.id ?? null,
    nutritionTarget: ri.nutritionTarget,
    additionalInfo: ri.additionalInfo,
    // Legacy recipes with no groups stay ungrouped in the editor.
    groupTempKey: ri.groupId ?? null,
    position: ri.position ?? index,
  }));
  const ingredientTempKeyById = new Map(
    ingredientRows.map((row) => [row.id, row.tempIngredientKey]),
  );

  // Map typed categories into dedicated recipe form fields.
  const flavourCategory = recipe.categories.find((cat) => cat.type === "FLAVOUR");
  const proteinCategory = recipe.categories.find((cat) => cat.type === "PROTEIN");
  const recipeTypeCategory = recipe.categories.find(
    (cat) => cat.type === "RECIPE_TYPE",
  );

  return {
    name: recipe.name,
    flavourCategoryId: flavourCategory?.id ?? "",
    proteinCategoryId: proteinCategory?.id ?? null,
    typeCategoryId: recipeTypeCategory?.id ?? null,
    images: recipe.images?.map((img) => ({
      url: img.url,
      isCover: img.isCover,
    })) || [],
    handsOnTime: recipe.handsOnTime,
    totalTime: recipe.totalTime,
    servings: recipe.servings,
    servingMultiplierForNelson: recipe.servingMultiplierForNelson,
    ingredientGroups,
    ingredients: ingredientRows,
    instructions: recipe.instructions.map((instruction) => ({
      id: instruction.id,
      text: instruction.text,
      linkedTempIngredientKeys: instruction.ingredients
        .map((link) => ingredientTempKeyById.get(link.recipeIngredientId))
        .filter((key): key is string => Boolean(key)),
    })),
    notes: recipe.notes.join("\n"),
    excludeFromPlanner: recipe.excludeFromPlanner,
  };
}

export function formatInstructionIngredientBadge(input: {
  rawAmount: number | null;
  rawAmountInGrams?: number | null;
  displayAmount: string | null;
  displayUnitName: string;
  displayUnitNamePlural?: string | null;
  ingredientName: string;
  additionalInfo?: string | null;
}): string {
  const {
    rawAmount,
    rawAmountInGrams,
    displayAmount,
    displayUnitName,
    displayUnitNamePlural,
    ingredientName,
    additionalInfo,
  } = input;

  if (rawAmount == null || displayAmount == null) {
    return formatIngredientLabel({
      ingredientName,
      additionalInfo,
    });
  }

  const amountText =
    rawAmount > 0 && rawAmount < 0.1
      ? "<0.1"
      : displayAmount != null
        ? formatIngredientAmount(Number(displayAmount), 2)
        : formatIngredientAmount(rawAmount, 2);
  const resolvedUnitName = getUnitDisplayName({
    amount: rawAmount,
    unitName: displayUnitName,
    unitNamePlural: displayUnitNamePlural ?? null,
  });
  const shouldHideUnit = isPieceUnit(resolvedUnitName);
  const shouldShowGrams =
    rawAmountInGrams != null && !isGramUnit(resolvedUnitName);
  const gramsText = shouldShowGrams
    ? rawAmountInGrams > 0 && rawAmountInGrams < 0.1
      ? "<0.1g"
      : `${formatIngredientAmount(rawAmountInGrams, 2)}g`
    : null;

  const base = [
    amountText,
    shouldHideUnit ? null : resolvedUnitName,
    gramsText ? `(${gramsText})` : null,
    ingredientName,
  ]
    .filter((token): token is string => Boolean(token))
    .join(" ");
  return additionalInfo ? `${base} (${additionalInfo})` : base;
}

export type NutritionPerPortion = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type NutritionRole = "primary" | "secondary";
export type NutritionTarget = "BOTH" | "PRIMARY_ONLY" | "SECONDARY_ONLY";
export type InstructionPersonFilter = "jagoda" | "nelson" | null;

export function resolveNutritionRole(input: "jagoda" | "nelson" | NutritionRole): NutritionRole {
  return input === "jagoda" ? "primary" : input === "nelson" ? "secondary" : input;
}

export function getPrimaryCalorieScalingFactorForTarget(
  nutritionTarget: NutritionTarget,
  primaryCalorieScalingFactor: number,
): number {
  // Option A: primary calorie target never alters secondary-only ingredient amounts.
  if (nutritionTarget === "SECONDARY_ONLY") {
    return 1;
  }
  return primaryCalorieScalingFactor;
}

/**
 * Determines whether an instruction ingredient badge should be visible
 * for the selected person filter.
 */
export function isInstructionIngredientVisibleForPerson(
  nutritionTarget: NutritionTarget,
  selectedPerson: InstructionPersonFilter,
): boolean {
  // No filter selected => keep existing "show all badges" behavior.
  if (selectedPerson == null) {
    return true;
  }
  if (nutritionTarget === "BOTH") {
    return true;
  }
  if (selectedPerson === "jagoda") {
    return nutritionTarget === "PRIMARY_ONLY";
  }
  return nutritionTarget === "SECONDARY_ONLY";
}

/**
 * Returns per-person portion factor used for BOTH-target instruction badges.
 */
export function getInstructionIngredientPersonFactor(
  nutritionTarget: NutritionTarget,
  selectedPerson: InstructionPersonFilter,
  jagodaPortionFactor: number,
  nelsonPortionFactor: number,
): number {
  // No person selected => preserve existing total recipe-row amount display.
  if (selectedPerson == null || nutritionTarget !== "BOTH") {
    return 1;
  }
  return selectedPerson === "jagoda" ? jagodaPortionFactor : nelsonPortionFactor;
}

function getIngredientNutritionTarget(
  recipeIngredient: RecipeType["ingredients"][number],
): NutritionTarget {
  return recipeIngredient.nutritionTarget as NutritionTarget;
}

export function calculateNutritionPerServing(
  recipe: RecipeType,
  person: "jagoda" | "nelson" | NutritionRole,
): NutritionPerPortion {
  const role = resolveNutritionRole(person);
  const secondaryMultiplier = recipe.servingMultiplierForNelson;
  const totalParts = 1 + secondaryMultiplier;
  const primaryPortionFactor = 1 / totalParts;
  const secondaryPortionFactor = secondaryMultiplier / totalParts;

  const total = recipe.ingredients.reduce(
    (acc, recipeIngredient) => {
      if (recipeIngredient.amount == null || recipeIngredient.unit == null) {
        return acc;
      }
      
      const ingredient = recipeIngredient.ingredient;
      const unit = recipeIngredient.unit;
  
      const conversion = ingredient.unitConversions.find(
        (uc) => uc.unitId === unit.id
      );

      if (!conversion) {
        return acc;
      }

      const grams = recipeIngredient.amount * conversion.gramsPerUnit;
      const nutrientMultiplier = grams / 100;
      const ingredientNutrition = {
        calories: ingredient.calories * nutrientMultiplier,
        protein: ingredient.proteins * nutrientMultiplier,
        fat: ingredient.fats * nutrientMultiplier,
        carbs: ingredient.carbs * nutrientMultiplier,
      };
      const target = getIngredientNutritionTarget(recipeIngredient);

      if (target === "PRIMARY_ONLY") {
        if (role !== "primary") {
          return acc;
        }
        return {
          calories: acc.calories + ingredientNutrition.calories,
          protein: acc.protein + ingredientNutrition.protein,
          fat: acc.fat + ingredientNutrition.fat,
          carbs: acc.carbs + ingredientNutrition.carbs,
        };
      }

      if (target === "SECONDARY_ONLY") {
        if (role !== "secondary") {
          return acc;
        }
        return {
          calories: acc.calories + ingredientNutrition.calories,
          protein: acc.protein + ingredientNutrition.protein,
          fat: acc.fat + ingredientNutrition.fat,
          carbs: acc.carbs + ingredientNutrition.carbs,
        };
      }

      // Shared ingredients are split by 1:multiplier across roles.
      const sharedFactor = role === "primary" ? primaryPortionFactor : secondaryPortionFactor;
      return {
        calories: acc.calories + ingredientNutrition.calories * sharedFactor,
        protein: acc.protein + ingredientNutrition.protein * sharedFactor,
        fat: acc.fat + ingredientNutrition.fat * sharedFactor,
        carbs: acc.carbs + ingredientNutrition.carbs * sharedFactor,
      };
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const mealCount = recipe.servings / 2;
  if (!Number.isFinite(mealCount) || mealCount <= 0) {
    return {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    };
  }

  const perMeal = {
    calories: total.calories / mealCount,
    protein: total.protein / mealCount,
    fat: total.fat / mealCount,
    carbs: total.carbs / mealCount,
  };

  return {
    calories: Math.round(perMeal.calories * 10) / 10,
    protein: Math.round(perMeal.protein * 10) / 10,
    fat: Math.round(perMeal.fat * 10) / 10,
    carbs: Math.round(perMeal.carbs * 10) / 10,
  };
}

export function scaleNutritionByCalories(
  baseNutrition: NutritionPerPortion,
  targetCalories: number
): NutritionPerPortion {

  const scalingFactor = targetCalories / baseNutrition.calories;

  return {
    calories: Math.round(baseNutrition.calories * scalingFactor * 10) / 10,
    protein: Math.round(baseNutrition.protein * scalingFactor * 10) / 10,
    fat: Math.round(baseNutrition.fat * scalingFactor * 10) / 10,
    carbs: Math.round(baseNutrition.carbs * scalingFactor * 10) / 10,
  };
}


export type ScalingCalculation = {
  servingScalingFactor: number;
  jagodaPortionFactor: number; 
  nelsonPortionFactor: number;  
};


// Per-100g nutritional values for a single ingredient, straight from DB
export function getIngredientNutritionPer100g(
  ingredient: { calories: number; proteins: number; fats: number; carbs: number }
): NutritionPerPortion {
  return {
    calories: Math.round(ingredient.calories * 10) / 10,
    protein: Math.round(ingredient.proteins * 10) / 10,
    fat: Math.round(ingredient.fats * 10) / 10,
    carbs: Math.round(ingredient.carbs * 10) / 10,
  };
}

export function scaleIngredientNutritionForGrams(
  nutritionPer100g: NutritionPerPortion,
  grams: number,
): NutritionPerPortion {
  const multiplier = grams / 100;
  return {
    calories: Math.round(nutritionPer100g.calories * multiplier * 10) / 10,
    protein: Math.round(nutritionPer100g.protein * multiplier * 10) / 10,
    fat: Math.round(nutritionPer100g.fat * multiplier * 10) / 10,
    carbs: Math.round(nutritionPer100g.carbs * multiplier * 10) / 10,
  };
}

export function calculateServingScalingFactor(
  currentServings: number,
  recipeServings: number,
  nelsonMultiplier: number
): ScalingCalculation {
  // Saved ingredient amounts already include Nelson's multiplier.
  // Scaling between serving counts should therefore be linear.
  const servingScalingFactor = currentServings / recipeServings;

  // Portion split per meal still follows Jagoda=1 part, Nelson=multiplier parts.
  const totalParts = 1 + nelsonMultiplier;
  const jagodaPortionFactor = 1 / totalParts;
  const nelsonPortionFactor = nelsonMultiplier / totalParts;

  return {
    servingScalingFactor,
    jagodaPortionFactor,
    nelsonPortionFactor,
  };
}

/**
 * Scale all nutrition values by a single factor.
 * Used for manual ingredient scaling and Nelson's portion calculation.
 */
export function scaleNutrition(
  nutrition: NutritionPerPortion,
  factor: number,
): NutritionPerPortion {
  return {
    calories: Math.round(nutrition.calories * factor * 10) / 10,
    protein: Math.round(nutrition.protein * factor * 10) / 10,
    fat: Math.round(nutrition.fat * factor * 10) / 10,
    carbs: Math.round(nutrition.carbs * factor * 10) / 10,
  };
}

/**
 * Computes the new manual scale ratio when a user edits an ingredient amount.
 * Absorbs the current calorie scaling into the manual ratio so that clearing
 * the calorie target doesn't cause other ingredients to jump.
 *
 * editRatio = newTypedValue / currentRawDisplayAmount
 */
export function computeManualScaleRatio(
  editRatio: number,
  currentCalorieScalingFactor: number,
  currentManualScaleRatio: number,
): number {
  return currentCalorieScalingFactor * currentManualScaleRatio * editRatio;
}

const SCALE_EPSILON = 1e-6;

/**
 * Snap tiny floating-point noise back to an exact identity scale.
 */
function normalizeScaleValue(scale: number): number {
  return Math.abs(scale - 1) <= SCALE_EPSILON ? 1 : scale;
}

/**
 * Returns true when a scale is materially different from identity.
 */
export function isScaleModified(scale: number): boolean {
  return normalizeScaleValue(scale) !== 1;
}

/**
 * Updates a row-local scale using the latest user edit ratio.
 * The edit ratio comes from currentDisplayedAmount / newlyTypedAmount.
 */
export function applyEditRatioToLocalScale(
  currentLocalScale: number,
  editRatio: number,
  activeCalorieScalingFactor = 1,
): number {
  return normalizeScaleValue(
    currentLocalScale * editRatio * activeCalorieScalingFactor,
  );
}

/**
 * Promotes a row-local edit into a global one-time scale for all rows.
 * This keeps scaling anchored to base amounts and clears row-level deltas.
 */
export function computeGlobalScaleFromEditedRow(
  currentGlobalScale: number,
  editedRowLocalScale: number,
): number {
  return normalizeScaleValue(currentGlobalScale * editedRowLocalScale);
}

export type IngredientSwapMap = Record<string, string>;

type SwapReadyIngredient = Pick<
  IngredientType,
  | "id"
  | "name"
  | "slug"
  | "icon"
  | "supermarketUrl"
  | "calories"
  | "proteins"
  | "fats"
  | "carbs"
  | "categoryId"
  // Include default unit metadata so swap candidates match full recipe ingredient shape.
  | "defaultUnitId"
  | "unitConversions"
>;

function getGramsConversion(ingredient: {
  unitConversions: UnitConversionWithName[];
}): UnitConversionWithName | null {
  return ingredient.unitConversions.find((uc) => uc.unit.name === "g") ?? null;
}

/**
 * Resolves one swapped recipe ingredient row for client-only simulation.
 * Tries same amount/unit first, then falls back to grams conversion.
 */
export function resolveSwappedRecipeIngredient(
  recipeIngredient: RecipeType["ingredients"][number],
  replacement: SwapReadyIngredient,
): RecipeType["ingredients"][number] {
  const hasSameUnitOnReplacement = replacement.unitConversions.some(
    (uc) => uc.unitId === recipeIngredient.unitId,
  );

  if (hasSameUnitOnReplacement) {
    return {
      ...recipeIngredient,
      ingredientId: replacement.id,
      ingredient: replacement,
    };
  }

  const originalUnitConversion = recipeIngredient.ingredient.unitConversions.find(
    (uc) => uc.unitId === recipeIngredient.unitId,
  );
  const replacementGramsConversion = getGramsConversion(replacement);

  if (!originalUnitConversion || !replacementGramsConversion) {
    return {
      ...recipeIngredient,
      ingredientId: replacement.id,
      ingredient: replacement,
    };
  }

  const convertedAmount =
    recipeIngredient.amount == null
      ? null
      : convertAmount(
          recipeIngredient.amount,
          originalUnitConversion.gramsPerUnit,
          replacementGramsConversion.gramsPerUnit,
        );

  return {
    ...recipeIngredient,
    ingredientId: replacement.id,
    ingredient: replacement,
    amount: convertedAmount,
    unitId: replacementGramsConversion.unitId,
    unit: {
      ...replacementGramsConversion.unit,
      // Normalize optional plural field to match RecipeType's nullable (not undefined) contract.
      namePlural: replacementGramsConversion.unit.namePlural ?? null,
    },
  };
}

/**
 * Builds a derived recipe object used only for swap simulation.
 * Original recipe data remains unchanged and is never persisted.
 */
export function buildEffectiveRecipeForSimulation(
  recipe: RecipeType,
  swapsByRecipeIngredientId: IngredientSwapMap,
  replacementCandidates: SwapReadyIngredient[],
): RecipeType {
  const replacementById = new Map(
    replacementCandidates.map((ingredient) => [ingredient.id, ingredient]),
  );

  const ingredients = recipe.ingredients.map((recipeIngredient) => {
    const replacementId = swapsByRecipeIngredientId[recipeIngredient.id];
    if (!replacementId || replacementId === recipeIngredient.ingredient.id) {
      return recipeIngredient;
    }

    const replacement = replacementById.get(replacementId);
    if (!replacement) {
      return recipeIngredient;
    }

    return resolveSwappedRecipeIngredient(recipeIngredient, replacement);
  });

  return {
    ...recipe,
    ingredients,
  };
}
