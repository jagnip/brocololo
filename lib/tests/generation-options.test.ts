import { describe, expect, it } from "vitest";
import {
  buildGroceryMealOptionsFromSlots,
  exclusionsFromSelectedMealKeys,
  filterSlotsForGroceryGeneration,
  groceryMealOptionKey,
} from "@/lib/groceries/generation-options";
import type { PlanSlotData } from "@/lib/groceries/helpers";

describe("buildGroceryMealOptionsFromSlots", () => {
  it("dedupes recipes and counts occurrences", () => {
    const options = buildGroceryMealOptionsFromSlots([
      {
        recipeId: "recipe-chili",
        recipe: { name: "Chili con carne" },
        customName: null,
        customIngredients: [],
      },
      {
        recipeId: "recipe-chili",
        recipe: { name: "Chili con carne" },
        customName: null,
        customIngredients: [],
      },
      {
        recipeId: "recipe-pasta",
        recipe: { name: "Pasta" },
        customName: null,
        customIngredients: [],
      },
    ]);

    expect(options).toHaveLength(2);
    expect(options.find((o) => o.kind === "recipe" && o.recipeId === "recipe-chili")).toMatchObject({
      name: "Chili con carne",
      occurrenceCount: 2,
    });
  });

  it("includes custom meals with ingredients and skips name-only custom meals", () => {
    const options = buildGroceryMealOptionsFromSlots([
      {
        recipeId: null,
        recipe: null,
        customName: "Eating out",
        customIngredients: [],
      },
      {
        recipeId: null,
        recipe: null,
        customName: "Friday pasta",
        customIngredients: [{ ingredientId: "ing-1" }],
      },
    ]);

    expect(options).toEqual([
      { kind: "custom", name: "Friday pasta", occurrenceCount: 1 },
    ]);
  });
});

describe("filterSlotsForGroceryGeneration", () => {
  const stockedSlot: PlanSlotData = {
    recipeId: "recipe-stocked",
    recipe: {
      name: "Stocked",
      servings: 2,
      ingredients: [
        {
          ingredient: {
            id: "ing-1",
            name: "Onion",
            icon: null,
            supermarketUrl: null,
            unitConversions: [{ unitId: "unit-g", gramsPerUnit: 1 }],
            category: { id: "cat-produce", name: "Produce", sortOrder: 1 },
          },
          unit: { id: "unit-g", name: "g" },
          amount: 100,
        },
      ],
    },
  };

  const shopSlot: PlanSlotData = {
    recipeId: "recipe-shop",
    recipe: {
      name: "Shop",
      servings: 2,
      ingredients: [
        {
          ingredient: {
            id: "ing-1",
            name: "Onion",
            icon: null,
            supermarketUrl: null,
            unitConversions: [{ unitId: "unit-g", gramsPerUnit: 1 }],
            category: { id: "cat-produce", name: "Produce", sortOrder: 1 },
          },
          unit: { id: "unit-g", name: "g" },
          amount: 50,
        },
      ],
    },
  };

  it("excludes all slots for an excluded recipe id", () => {
    const filtered = filterSlotsForGroceryGeneration([stockedSlot, shopSlot], {
      excludedRecipeIds: ["recipe-stocked"],
      excludedCustomMealNames: [],
    });

    expect(filtered).toEqual([shopSlot]);
  });
});

describe("exclusionsFromSelectedMealKeys", () => {
  it("maps unchecked meals to exclusion lists", () => {
    const meals = [
      { kind: "recipe" as const, recipeId: "r1", name: "Chili", occurrenceCount: 2 },
      { kind: "custom" as const, name: "Friday pasta", occurrenceCount: 1 },
    ];

    const exclusions = exclusionsFromSelectedMealKeys(
      meals,
      new Set([groceryMealOptionKey(meals[1]!)]),
    );

    expect(exclusions).toEqual({
      excludedRecipeIds: ["r1"],
      excludedCustomMealNames: [],
    });
  });
});
