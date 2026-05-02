import { describe, expect, it } from "vitest";
import { calculateNutritionPerServing } from "@/lib/recipes/helpers";
import { buildDraftRecipeForNutrition } from "@/lib/recipes/build-draft-recipe-for-nutrition";
import {
  createMockIngredient,
  createMockIngredientUnit,
  createMockRecipe,
} from "../tests/test-helpers";

const chicken = createMockIngredient({
  id: "ing-chicken",
  calories: 165,
  proteins: 31,
  fats: 3.6,
  carbs: 0,
  unitConversions: [createMockIngredientUnit("ing-chicken", "unit-grams", 1)],
});

const bread = createMockIngredient({
  id: "ing-bread",
  calories: 265,
  proteins: 9,
  fats: 3.2,
  carbs: 49,
  unitConversions: [createMockIngredientUnit("ing-bread", "unit-grams", 1)],
});

function formRowFrom(
  overrides: Partial<{
    tempIngredientKey: string;
    ingredientId: string;
    amount: number | null | undefined;
    unitId: string | null | undefined;
    nutritionTarget: "BOTH" | "PRIMARY_ONLY" | "SECONDARY_ONLY";
    position: number;
  }> & { tempIngredientKey: string; ingredientId: string },
) {
  return {
    tempIngredientKey: overrides.tempIngredientKey,
    ingredientId: overrides.ingredientId,
    amount: overrides.amount ?? null,
    unitId: overrides.unitId ?? null,
    nutritionTarget: overrides.nutritionTarget ?? "BOTH",
    additionalInfo: null as string | null,
    groupTempKey: null as string | null,
    position: overrides.position ?? 0,
  };
}

describe("buildDraftRecipeForNutrition", () => {
  it("drops placeholder rows without ingredientId and rows missing catalog match", () => {
    const draft = buildDraftRecipeForNutrition(
      2,
      2,
      [
        formRowFrom({
          tempIngredientKey: "empty",
          ingredientId: "",
          amount: 100,
          unitId: "unit-grams",
        }),
        formRowFrom({
          tempIngredientKey: "orphan",
          ingredientId: "unknown-ing",
          amount: 100,
          unitId: "unit-grams",
        }),
      ],
      [chicken],
    );
    expect(draft.ingredients).toHaveLength(0);
    expect(calculateNutritionPerServing(draft, "primary")).toEqual({
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    });
  });

  it("skips rows without usable amount, unitId, or unit conversion", () => {
    const draftIncomplete = buildDraftRecipeForNutrition(
      2,
      1,
      [
        formRowFrom({
          tempIngredientKey: "no-amount",
          ingredientId: "ing-chicken",
          amount: null,
          unitId: "unit-grams",
        }),
        formRowFrom({
          tempIngredientKey: "bad-unit",
          ingredientId: "ing-chicken",
          amount: 100,
          unitId: "no-such-unit",
        }),
      ],
      [chicken],
    );
    expect(draftIncomplete.ingredients).toHaveLength(0);
  });

  it("matches calculateNutritionPerServing for parity with persisted recipe fixtures", () => {
    const recipe = createMockRecipe({
      servings: 2,
      servingMultiplierForNelson: 2,
      ingredients: [
        {
          id: "ri-chicken",
          recipeId: "recipe-1",
          ingredientId: "ing-chicken",
          unitId: "unit-grams",
          amount: 300,
          nutritionTarget: "BOTH",
          additionalInfo: null,
          ingredient: chicken,
          unit: { id: "unit-grams", name: "grams", namePlural: null },
        },
        {
          id: "ri-bread",
          recipeId: "recipe-1",
          ingredientId: "ing-bread",
          unitId: "unit-grams",
          amount: 300,
          nutritionTarget: "BOTH",
          additionalInfo: null,
          ingredient: bread,
          unit: { id: "unit-grams", name: "grams", namePlural: null },
        },
      ],
    });

    const draft = buildDraftRecipeForNutrition(
      2,
      2,
      [
        formRowFrom({
          tempIngredientKey: "t-chicken",
          ingredientId: "ing-chicken",
          amount: 300,
          unitId: "unit-grams",
        }),
        formRowFrom({
          tempIngredientKey: "t-bread",
          ingredientId: "ing-bread",
          amount: 300,
          unitId: "unit-grams",
          position: 1,
        }),
      ],
      [chicken, bread],
    );

    expect(calculateNutritionPerServing(draft, "primary")).toEqual(
      calculateNutritionPerServing(recipe, "primary"),
    );
    expect(calculateNutritionPerServing(draft, "secondary")).toEqual(
      calculateNutritionPerServing(recipe, "secondary"),
    );
  });

  it("uses zeros for nutrition when portions are unset or invalid", () => {
    const draft = buildDraftRecipeForNutrition(
      "",
      1,
      [
        formRowFrom({
          tempIngredientKey: "t1",
          ingredientId: "ing-chicken",
          amount: 100,
          unitId: "unit-grams",
        }),
      ],
      [chicken],
    );
    expect(calculateNutritionPerServing(draft, "primary").calories).toBe(0);
  });

  it("defaults invalid Nelson multiplier to 1 while building draft", () => {
    const draft = buildDraftRecipeForNutrition(
      2,
      "",
      [
        formRowFrom({
          tempIngredientKey: "t1",
          ingredientId: "ing-chicken",
          amount: 300,
          unitId: "unit-grams",
        }),
      ],
      [chicken],
    );
    expect(draft.servingMultiplierForNelson).toBe(1);
  });
});
