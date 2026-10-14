import type { PlanSlotData } from "@/lib/groceries/helpers";

export type GroceryMealOption =
  | { kind: "recipe"; recipeId: string; name: string; occurrenceCount: number; storageCount?: number; alreadyAvailable?: boolean; alreadyCooked?: boolean }
  | { kind: "custom"; name: string; occurrenceCount: number };

export type GroceryGenerationExclusions = {
  excludedRecipeIds: string[];
  excludedCustomMealNames: string[];
  /** Explicit opt-in for rolled-over/cooked sources; fresh exclusions stay independent. */
  includedAvailableRecipeIds?: string[];
};

export type GrocerySlotForMealOptions = {
  isRolledOver?: boolean;
  alreadyCooked?: boolean;
  isStorage?: boolean;
  recipeId: string | null;
  recipe: { name: string } | null;
  customName: string | null;
  customIngredients: unknown[] | null | undefined;
};

/** Stable key for checkbox selection state in the meal-selection dialog. */
export function groceryMealOptionKey(option: GroceryMealOption): string {
  return option.kind === "recipe"
    ? `recipe:${option.recipeId}${option.alreadyAvailable ? ":available" : ""}`
    : `custom:${option.name}`;
}

/** Group fresh and already-available recipe quantities separately. */
export function buildGroceryMealOptionsFromSlots(
  slots: GrocerySlotForMealOptions[],
): GroceryMealOption[] {
  const recipeCounts = new Map<string, { recipeId: string; name: string; count: number; storageCount: number; alreadyAvailable: boolean; alreadyCooked: boolean }>();
  const customCounts = new Map<string, number>();

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

    if (slot.isRolledOver || slot.alreadyCooked) continue;

    const customIngredientCount = slot.customIngredients?.length ?? 0;
    if (slot.customName && customIngredientCount > 0) {
      customCounts.set(
        slot.customName,
        (customCounts.get(slot.customName) ?? 0) + 1,
      );
    }
  }

  const options: GroceryMealOption[] = [];

  for (const { recipeId, name, count, storageCount, alreadyAvailable, alreadyCooked } of recipeCounts.values()) {
    options.push({ kind: "recipe", recipeId, name, occurrenceCount: count, ...(storageCount > 0 ? { storageCount } : {}), ...(alreadyAvailable ? { alreadyAvailable: true } : {}), ...(alreadyCooked ? { alreadyCooked: true } : {}) });
  }

  for (const [name, occurrenceCount] of customCounts) {
    options.push({ kind: "custom", name, occurrenceCount });
  }

  return options.sort((a, b) => a.name.localeCompare(b.name));
}

/** Drop ineligible slots and apply ephemeral generation-time choices. */
export function filterSlotsForGroceryGeneration(
  slots: PlanSlotData[],
  exclusions: GroceryGenerationExclusions,
): PlanSlotData[] {
  const excludedRecipeIds = new Set(exclusions.excludedRecipeIds);
  const excludedCustomMealNames = new Set(exclusions.excludedCustomMealNames);
  const includedAvailableRecipeIds = new Set(exclusions.includedAvailableRecipeIds ?? []);

  return slots.filter((slot) => {
    if (slot.isRolledOver || slot.alreadyCooked) {
      return !!slot.recipeId && includedAvailableRecipeIds.has(slot.recipeId);
    }

    if (slot.recipeId && excludedRecipeIds.has(slot.recipeId)) {
      return false;
    }

    const customIngredientCount = slot.customIngredients?.length ?? 0;
    if (
      slot.customName &&
      customIngredientCount > 0 &&
      excludedCustomMealNames.has(slot.customName)
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
  const excludedCustomMealNames: string[] = [];
  const includedAvailableRecipeIds: string[] = [];

  for (const meal of meals) {
    const key = groceryMealOptionKey(meal);
    if (meal.kind === "recipe" && meal.alreadyAvailable) {
      if (selectedKeys.has(key)) includedAvailableRecipeIds.push(meal.recipeId);
      continue;
    }
    if (selectedKeys.has(key)) continue;

    if (meal.kind === "recipe") {
      excludedRecipeIds.push(meal.recipeId);
    } else {
      excludedCustomMealNames.push(meal.name);
    }
  }

  return {
    excludedRecipeIds,
    excludedCustomMealNames,
    ...(includedAvailableRecipeIds.length > 0 ? { includedAvailableRecipeIds } : {}),
  };
}
