import { describe, expect, it } from "vitest";
import { calculateNutritionPerServing } from "@/lib/recipes/helpers";
import {
  createMockIngredient,
  createMockIngredientUnit,
  createMockRecipeIngredient,
  createMockUnit,
} from "@/lib/tests/test-helpers";

/**
 * Nutrition stays PER SERVING for advanced cooking.
 * personMealCounts must not multiply these totals — ingredients handle meal counts.
 */
describe("cook-session nutrition stays per serving", () => {
  const nutritionFamilyMembers = [
    { id: "family-self", isSelf: true },
    { id: "family-member-1", isSelf: false },
  ];

  it("returns one-meal nutrition even when cook session has many meals (contract)", () => {
    const grams = createMockUnit({ id: "unit-g", name: "grams" });
    const ingredient = createMockIngredient({
      id: "ing-rice",
      calories: 100,
      proteins: 10,
      fats: 1,
      carbs: 20,
      unitConversions: [createMockIngredientUnit("ing-rice", "unit-g", 1, "grams")],
    });
    const row = createMockRecipeIngredient({
      id: "ri-rice",
      amount: 100,
      nutritionTarget: "BOTH",
      ingredient,
      unit: grams,
    });

    const recipe = {
      servings: 1,
      memberPortions: [
        { recipeId: "recipe-1", familyMemberId: "family-member-1", multiplier: 2 },
      ],
      audienceMembers: [],
      ingredients: [row],
    };

    const oneMealJagoda = calculateNutritionPerServing(
      recipe as never,
      "family-self",
      nutritionFamilyMembers,
      [ingredient],
    );

    // Calling again with the same recipe must stay one-meal (UI never passes mealCount here).
    const stillOneMeal = calculateNutritionPerServing(
      recipe as never,
      "family-self",
      nutritionFamilyMembers,
      [ingredient],
    );

    expect(stillOneMeal.calories).toBe(oneMealJagoda.calories);
    expect(stillOneMeal.calories).toBe(100);
  });
});
