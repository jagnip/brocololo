import { describe, expect, it } from "vitest";
import {
  buildGroceryMealOptionsFromSlots,
  exclusionsFromSelectedMealKeys,
  filterSlotsForGroceryGeneration,
  groceryMealOptionKey,
} from "./generation-options";

const recipeSlot = {
  recipeId: "chili",
  recipe: { name: "Chili", servings: 1, ingredients: [] },
  customName: null,
  customIngredients: [],
};

describe("grocery quantity selection", () => {
  it("counts scheduled and stored meals separately within each recipe source", () => {
    expect(buildGroceryMealOptionsFromSlots([
      recipeSlot,
      recipeSlot,
      { ...recipeSlot, isStorage: true },
      { ...recipeSlot, isStorage: true },
      { ...recipeSlot, isStorage: true },
      { ...recipeSlot, alreadyCooked: true },
    ])).toEqual([
      { kind: "recipe", recipeId: "chili", name: "Chili", occurrenceCount: 2, storageCount: 3 },
      { kind: "recipe", recipeId: "chili", name: "Chili", occurrenceCount: 1, alreadyAvailable: true, alreadyCooked: true },
    ]);
  });

  it("offers fresh and available quantities of the same recipe separately", () => {
    expect(buildGroceryMealOptionsFromSlots([
      recipeSlot,
      { ...recipeSlot, isRolledOver: true },
      { ...recipeSlot, alreadyCooked: true },
    ])).toEqual([
      { kind: "recipe", recipeId: "chili", name: "Chili", occurrenceCount: 1 },
      { kind: "recipe", recipeId: "chili", name: "Chili", occurrenceCount: 2, alreadyAvailable: true, alreadyCooked: true },
    ]);
  });

  it("offers rolled-over and cooked-only recipes", () => {
    const options = buildGroceryMealOptionsFromSlots([
      { ...recipeSlot, isRolledOver: true, alreadyCooked: true },
    ]);
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ alreadyAvailable: true, occurrenceCount: 1 });
    expect(options[0]).toMatchObject({ alreadyCooked: true });
  });

  it("keeps available quantities excluded without explicit opt-in", () => {
    const slots = [recipeSlot, { ...recipeSlot, isRolledOver: true }, { ...recipeSlot, alreadyCooked: true }];
    expect(filterSlotsForGroceryGeneration(slots, {
      excludedRecipeIds: [], excludedCustomMealKeys: [],
    })).toEqual([recipeSlot]);
  });

  it("includes only available quantities when fresh quantities are unchecked", () => {
    const slots = [recipeSlot, { ...recipeSlot, isRolledOver: true }, { ...recipeSlot, alreadyCooked: true }];
    const options = buildGroceryMealOptionsFromSlots(slots);
    const available = options.find((option) => option.kind === "recipe" && option.alreadyAvailable)!;
    const exclusions = exclusionsFromSelectedMealKeys(options, new Set([groceryMealOptionKey(available)]));
    expect(exclusions).toEqual({
      excludedRecipeIds: ["chili"],
      excludedCustomMealKeys: [],
      includedAvailableRecipeIds: ["chili"],
    });
    expect(filterSlotsForGroceryGeneration(slots, exclusions)).toEqual(slots.slice(1));
  });

  it("includes all quantities when both sources are checked", () => {
    const slots = [recipeSlot, { ...recipeSlot, isRolledOver: true }];
    const options = buildGroceryMealOptionsFromSlots(slots);
    expect(filterSlotsForGroceryGeneration(slots,
      exclusionsFromSelectedMealKeys(options, new Set(options.map(groceryMealOptionKey))),
    )).toEqual(slots);
  });
});
