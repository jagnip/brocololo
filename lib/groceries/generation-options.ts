import type { PlanSlotData } from "@/lib/groceries/helpers";

export type GroceryMealOption =
  | { kind: "recipe"; recipeId: string; name: string; occurrenceCount: number }
  | { kind: "custom"; name: string; occurrenceCount: number };

export type GroceryGenerationExclusions = {
  excludedRecipeIds: string[];
  excludedCustomMealNames: string[];
};

export type GrocerySlotForMealOptions = {
  recipeId: string | null;
  recipe: { name: string } | null;
  customName: string | null;
  customIngredients: unknown[] | null | undefined;
};

/** Stable key for checkbox selection state in the meal-selection dialog. */
export function groceryMealOptionKey(option: GroceryMealOption): string {
  return option.kind === "recipe"
    ? `recipe:${option.recipeId}`
    : `custom:${option.name}`;
}

/** Dedupe plan slots into dialog rows (per recipe / per custom meal name). */
export function buildGroceryMealOptionsFromSlots(
  slots: GrocerySlotForMealOptions[],
): GroceryMealOption[] {
  const recipeCounts = new Map<string, { name: string; count: number }>();
  const customCounts = new Map<string, number>();

  for (const slot of slots) {
    if (slot.recipeId && slot.recipe) {
      const existing = recipeCounts.get(slot.recipeId);
      if (existing) {
        existing.count += 1;
      } else {
        recipeCounts.set(slot.recipeId, { name: slot.recipe.name, count: 1 });
      }
      continue;
    }

    const customIngredientCount = slot.customIngredients?.length ?? 0;
    if (slot.customName && customIngredientCount > 0) {
      customCounts.set(
        slot.customName,
        (customCounts.get(slot.customName) ?? 0) + 1,
      );
    }
  }

  const options: GroceryMealOption[] = [];

  for (const [recipeId, { name, count }] of recipeCounts) {
    options.push({ kind: "recipe", recipeId, name, occurrenceCount: count });
  }

  for (const [name, occurrenceCount] of customCounts) {
    options.push({ kind: "custom", name, occurrenceCount });
  }

  return options.sort((a, b) => a.name.localeCompare(b.name));
}

/** Drop slots excluded by ephemeral generation-time choices. */
export function filterSlotsForGroceryGeneration(
  slots: PlanSlotData[],
  exclusions: GroceryGenerationExclusions,
): PlanSlotData[] {
  const excludedRecipeIds = new Set(exclusions.excludedRecipeIds);
  const excludedCustomMealNames = new Set(exclusions.excludedCustomMealNames);

  return slots.filter((slot) => {
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

  for (const meal of meals) {
    const key = groceryMealOptionKey(meal);
    if (selectedKeys.has(key)) continue;

    if (meal.kind === "recipe") {
      excludedRecipeIds.push(meal.recipeId);
    } else {
      excludedCustomMealNames.push(meal.name);
    }
  }

  return { excludedRecipeIds, excludedCustomMealNames };
}
