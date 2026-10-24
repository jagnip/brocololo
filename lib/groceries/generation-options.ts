import type { PlanSlotData } from "@/lib/groceries/helpers";

export type GroceryMealOption =
  | { kind: "recipe"; recipeId: string; name: string; occurrenceCount: number; storageCount?: number; alreadyAvailable?: boolean; alreadyCooked?: boolean }
  | { kind: "custom"; customMealKey?: string; name: string; occurrenceCount: number; alreadyAvailable?: boolean };

export type GroceryGenerationExclusions = {
  excludedRecipeIds: string[];
  excludedCustomMealKeys?: string[];
  /** Legacy name-only exclusions from pre-canonical custom meal selection. */
  excludedCustomMealNames?: string[];
  /** Explicit opt-in for rolled-over/cooked sources; fresh exclusions stay independent. */
  includedAvailableRecipeIds?: string[];
  includedAvailableCustomMealKeys?: string[];
};

export type GrocerySlotForMealOptions = {
  isRolledOver?: boolean;
  alreadyCooked?: boolean;
  isStorage?: boolean;
  recipeId?: string | null;
  recipe: { name: string } | null;
  customName?: string | null;
  customIngredients?: Array<{
    amount?: number | null;
    ingredientId?: string;
    unitId?: string | null;
    ingredient?: { id: string };
    unit?: { id: string } | null;
  }> | null | undefined;
};

function groceryCustomMealKey(slot: GrocerySlotForMealOptions): string | null {
  if (!slot.customName || !slot.customIngredients?.length) return null;
  const ingredients = slot.customIngredients
    .map((ingredient) => [ingredient.ingredient?.id ?? ingredient.ingredientId ?? "", ingredient.unit?.id ?? ingredient.unitId ?? null, ingredient.amount])
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return JSON.stringify([slot.customName.trim().toLocaleLowerCase(), ingredients]);
}

/** Stable key for checkbox selection state in the meal-selection dialog. */
export function groceryMealOptionKey(option: GroceryMealOption): string {
  return option.kind === "recipe"
    ? `recipe:${option.recipeId}${option.alreadyAvailable ? ":available" : ""}`
    : `custom:${option.customMealKey ?? option.name}${option.alreadyAvailable ? ":available" : ""}`;
}

/** Group fresh and already-available recipe quantities separately. */
export function buildGroceryMealOptionsFromSlots(
  slots: GrocerySlotForMealOptions[],
): GroceryMealOption[] {
  const recipeCounts = new Map<string, { recipeId: string; name: string; count: number; storageCount: number; alreadyAvailable: boolean; alreadyCooked: boolean }>();
  const customCounts = new Map<string, { name: string; count: number; alreadyAvailable: boolean }>();

  for (const slot of slots) {
    if (slot.recipeId && slot.recipe) {
      const alreadyAvailable = !!(slot.isRolledOver || slot.alreadyCooked);
      const key = `${slot.recipeId}:${alreadyAvailable}`;
      const existing = recipeCounts.get(key);
      if (existing) {
        if (slot.isStorage) existing.storageCount += 1;
        else existing.count += 1;
        existing.alreadyCooked ||= !!slot.alreadyCooked;
      } else {
        recipeCounts.set(key, { recipeId: slot.recipeId, name: slot.recipe.name, count: slot.isStorage ? 0 : 1, storageCount: slot.isStorage ? 1 : 0, alreadyAvailable, alreadyCooked: !!slot.alreadyCooked });
      }
      continue;
    }

    const customMealKey = groceryCustomMealKey(slot);
    if (customMealKey && slot.customName) {
      const alreadyAvailable = !!(slot.isRolledOver || slot.alreadyCooked);
      const key = `${customMealKey}:${alreadyAvailable}`;
      const existing = customCounts.get(key);
      if (existing) existing.count += 1;
      else customCounts.set(key, { name: slot.customName, count: 1, alreadyAvailable });
    }
  }

  const options: GroceryMealOption[] = [];

  for (const { recipeId, name, count, storageCount, alreadyAvailable, alreadyCooked } of recipeCounts.values()) {
    options.push({ kind: "recipe", recipeId, name, occurrenceCount: count, ...(storageCount > 0 ? { storageCount } : {}), ...(alreadyAvailable ? { alreadyAvailable: true } : {}), ...(alreadyCooked ? { alreadyCooked: true } : {}) });
  }

  for (const [key, { name, count, alreadyAvailable }] of customCounts) {
    const customMealKey = key.slice(0, key.lastIndexOf(":"));
    options.push({ kind: "custom", customMealKey, name, occurrenceCount: count, ...(alreadyAvailable ? { alreadyAvailable: true } : {}) });
  }

  return options.sort((a, b) => a.name.localeCompare(b.name));
}

/** Drop ineligible slots and apply ephemeral generation-time choices. */
export function filterSlotsForGroceryGeneration(
  slots: PlanSlotData[],
  exclusions: GroceryGenerationExclusions,
): PlanSlotData[] {
  const excludedRecipeIds = new Set(exclusions.excludedRecipeIds);
  const excludedCustomMealKeys = new Set(exclusions.excludedCustomMealKeys ?? exclusions.excludedCustomMealNames ?? []);
  const includedAvailableRecipeIds = new Set(exclusions.includedAvailableRecipeIds ?? []);
  const includedAvailableCustomMealKeys = new Set(exclusions.includedAvailableCustomMealKeys ?? []);

  return slots.filter((slot) => {
    if (slot.isRolledOver || slot.alreadyCooked) {
      if (slot.recipeId) return includedAvailableRecipeIds.has(slot.recipeId);
    const customMealKey = groceryCustomMealKey(slot);
      return customMealKey != null && includedAvailableCustomMealKeys.has(customMealKey);
    }

    if (slot.recipeId && excludedRecipeIds.has(slot.recipeId)) {
      return false;
    }

    const customIngredientCount = slot.customIngredients?.length ?? 0;
    if (
      slot.customName &&
      customIngredientCount > 0 &&
      excludedCustomMealKeys.has(groceryCustomMealKey(slot) ?? "")
    ) {
      return false;
    }

    return true;
  });
}

/** Convert checked meal keys to server exclusion payload. */
export function exclusionsFromSelectedMealKeys(
  meals: GroceryMealOption[],
  selectedKeys: Set<string>,
): GroceryGenerationExclusions {
  const excludedRecipeIds: string[] = [];
  const excludedCustomMealKeys: string[] = [];
  const includedAvailableRecipeIds: string[] = [];
  const includedAvailableCustomMealKeys: string[] = [];

  for (const meal of meals) {
    const key = groceryMealOptionKey(meal);
    if (meal.alreadyAvailable) {
      if (selectedKeys.has(key)) {
        if (meal.kind === "recipe") includedAvailableRecipeIds.push(meal.recipeId);
        else includedAvailableCustomMealKeys.push(meal.customMealKey ?? meal.name);
      }
      continue;
    }
    if (selectedKeys.has(key)) continue;

    if (meal.kind === "recipe") {
      excludedRecipeIds.push(meal.recipeId);
    } else {
      excludedCustomMealKeys.push(meal.customMealKey ?? meal.name);
    }
  }

  return {
    excludedRecipeIds,
    excludedCustomMealKeys,
    ...(includedAvailableRecipeIds.length > 0 ? { includedAvailableRecipeIds } : {}),
    ...(includedAvailableCustomMealKeys.length > 0 ? { includedAvailableCustomMealKeys } : {}),
  };
}
