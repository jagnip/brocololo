import { describe, expect, it } from "vitest";
import {
  calculateNutritionPerServing,
  getPrimaryCalorieScalingFactorForTarget,
} from "../recipes/helpers";
import {
  createMockIngredient,
  createMockIngredientUnit,
  createMockRecipe,
  createMockUnit,
} from "./test-helpers";

function createChickenSandwichRecipe() {
  return createMockRecipe({
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
        ingredient: createMockIngredient({
          id: "ing-chicken",
          calories: 165,
          proteins: 31,
          fats: 3.6,
          carbs: 0,
          unitConversions: [createMockIngredientUnit("ing-chicken", "unit-grams", 1)],
        }),
        unit: createMockUnit({ id: "unit-grams", name: "grams" }),
      },
      {
        id: "ri-bread",
        recipeId: "recipe-1",
        ingredientId: "ing-bread",
        unitId: "unit-grams",
        amount: 300,
        nutritionTarget: "BOTH",
        additionalInfo: null,
        ingredient: createMockIngredient({
          id: "ing-bread",
          calories: 265,
          proteins: 9,
          fats: 3.2,
          carbs: 49,
          unitConversions: [createMockIngredientUnit("ing-bread", "unit-grams", 1)],
        }),
        unit: createMockUnit({ id: "unit-grams", name: "grams" }),
      },
    ],
  });
}

describe("calculateNutritionPerServing canonical recipe model", () => {
  it("splits BOTH-target ingredients by primary/secondary factors per meal", () => {
    const recipe = createChickenSandwichRecipe();

    const jagoda = calculateNutritionPerServing(recipe, "primary");
    const nelson = calculateNutritionPerServing(recipe, "secondary");

    // Total calories = 300*1.65 + 300*2.65 = 1290.
    // servings=2 => mealCount=1, split 1:2.
    expect(jagoda.calories).toBeCloseTo(430, 1);
    expect(nelson.calories).toBeCloseTo(860, 1);
    expect(jagoda.protein).toBeCloseTo(40, 1);
    expect(nelson.protein).toBeCloseTo(80, 1);
  });

  it("allocates PRIMARY_ONLY and SECONDARY_ONLY ingredients correctly", () => {
    const recipe = createMockRecipe({
      servings: 2,
      servingMultiplierForNelson: 2,
      ingredients: [
        {
          id: "ri-main",
          recipeId: "recipe-1",
          ingredientId: "ing-main",
          unitId: "unit-grams",
          amount: 200,
          nutritionTarget: "BOTH",
          additionalInfo: null,
          ingredient: createMockIngredient({
            id: "ing-main",
            calories: 100,
            proteins: 10,
            fats: 0,
            carbs: 0,
            unitConversions: [createMockIngredientUnit("ing-main", "unit-grams", 1)],
          }),
          unit: createMockUnit({ id: "unit-grams", name: "grams" }),
        },
        {
          id: "ri-oil",
          recipeId: "recipe-1",
          ingredientId: "ing-oil",
          unitId: "unit-grams",
          amount: 100,
          nutritionTarget: "SECONDARY_ONLY",
          additionalInfo: null,
          ingredient: createMockIngredient({
            id: "ing-oil",
            calories: 900,
            proteins: 0,
            fats: 100,
            carbs: 0,
            unitConversions: [createMockIngredientUnit("ing-oil", "unit-grams", 1)],
          }),
          unit: createMockUnit({ id: "unit-grams", name: "grams" }),
        },
      ],
    });

    const jagoda = calculateNutritionPerServing(recipe, "primary");
    const nelson = calculateNutritionPerServing(recipe, "secondary");

    // Primary ignores SECONDARY_ONLY oil.
    expect(jagoda.calories).toBeCloseTo(66.7, 1);
    // Secondary includes SECONDARY_ONLY oil.
    expect(nelson.calories).toBeCloseTo(1033.3, 1);
  });

  it("ignores null amount and missing conversion safely", () => {
    const recipe = createMockRecipe({
      servings: 2,
      servingMultiplierForNelson: 1.5,
      ingredients: [
        {
          id: "ri-null",
          recipeId: "recipe-1",
          ingredientId: "ing-null",
          unitId: "unit-grams",
          amount: null,
          nutritionTarget: "BOTH",
          additionalInfo: null,
          ingredient: createMockIngredient({
            id: "ing-null",
            calories: 500,
            proteins: 50,
            fats: 50,
            carbs: 50,
            unitConversions: [createMockIngredientUnit("ing-null", "unit-grams", 1)],
          }),
          unit: createMockUnit({ id: "unit-grams", name: "grams" }),
        },
        {
          id: "ri-missing",
          recipeId: "recipe-1",
          ingredientId: "ing-missing",
          unitId: "unit-cup",
          amount: 1,
          nutritionTarget: "BOTH",
          additionalInfo: null,
          ingredient: createMockIngredient({
            id: "ing-missing",
            calories: 500,
            proteins: 50,
            fats: 50,
            carbs: 50,
            unitConversions: [],
          }),
          unit: createMockUnit({ id: "unit-cup", name: "cup" }),
        },
      ],
    });

    expect(calculateNutritionPerServing(recipe, "primary")).toEqual({
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    });
    expect(calculateNutritionPerServing(recipe, "secondary")).toEqual({
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    });
  });
  it("includes PRIMARY_ONLY rows only for primary", () => {
    const recipe = createMockRecipe({
      servings: 2,
      servingMultiplierForNelson: 2,
      ingredients: [
        {
          id: "ri-primary",
          recipeId: "recipe-1",
          ingredientId: "ing-primary",
          unitId: "unit-grams",
          amount: 100,
          nutritionTarget: "PRIMARY_ONLY",
          additionalInfo: null,
          ingredient: createMockIngredient({
            id: "ing-primary",
            calories: 200,
            proteins: 10,
            fats: 0,
            carbs: 0,
            unitConversions: [createMockIngredientUnit("ing-primary", "unit-grams", 1)],
          }),
          unit: createMockUnit({ id: "unit-grams", name: "grams" }),
        },
      ],
    });

    expect(calculateNutritionPerServing(recipe, "primary").calories).toBeCloseTo(200, 1);
    expect(calculateNutritionPerServing(recipe, "secondary").calories).toBeCloseTo(0, 1);
  });
});

describe("Option A primary calorie scaling helper", () => {
  it("scales BOTH ingredients with primary calorie factor", () => {
    expect(getPrimaryCalorieScalingFactorForTarget("BOTH", 1.2)).toBe(1.2);
  });

  it("scales PRIMARY_ONLY ingredients with primary calorie factor", () => {
    expect(getPrimaryCalorieScalingFactorForTarget("PRIMARY_ONLY", 0.8)).toBe(0.8);
  });

  it("keeps SECONDARY_ONLY ingredients unchanged", () => {
    expect(getPrimaryCalorieScalingFactorForTarget("SECONDARY_ONLY", 1.3)).toBe(1);
  });
});
