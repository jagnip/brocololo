import { describe, it, expect } from 'vitest';
import { calculateNutritionPerServing, NutritionPerPortion, scaleNutritionByCalories } from '../utils';
import {
  createMockRecipe,
  createComplexMockRecipe,
  createRecipeWithExcludedIngredients,
  createRecipeWithNullAmounts,
  createRecipeWithMissingConversions,
  createMinimalRecipe,
  createMockIngredient,
  createMockUnit,
  createMockIngredientUnit,
} from './test-helpers';

/**
 * TESTING calculateNutritionPerServing
 * 
 * This function calculates nutritional value per serving based on:
 * 1. Ingredients and their amounts
 * 2. Unit conversions (to convert to grams)
 * 3. Nutritional data per 100g for each ingredient
 * 4. Number of servings
 * 
 * Formula: (amount_in_grams / 100) * nutrition_per_100g / servings
 */

describe('calculateNutritionPerServing', () => {
  /**
   * HAPPY PATH: Simple calculation with one ingredient
   * 
   * Recipe: 400g chicken for 4 servings
   * Chicken: 165 cal/100g, 31g protein/100g, 3.6g fat/100g, 0g carbs/100g
   * 
   * Calculation:
   * - Total: 400g * (165/100) = 660 calories
   * - Per serving: 660 / 4 = 165 calories
   */
  it('should calculate nutrition for one ingredient correctly', () => {
    // ARRANGE: Create a recipe with 400g chicken for 4 servings
    const recipe = createMockRecipe({
      servings: 4,
      ingredients: [
        {
          id: 'ri-1',
          recipeId: 'recipe-1',
          ingredientId: 'ing-1',
          unitId: 'unit-grams',
          amount: 400, // 400g
          excludeFromNutrition: false,
          additionalInfo: null,
          ingredient: createMockIngredient({
            id: 'ing-1',
            calories: 165, // per 100g
            proteins: 31,
            fats: 3.6,
            carbs: 0,
            unitConversions: [
              createMockIngredientUnit('ing-1', 'unit-grams', 1), // 1g = 1g
            ],
          }),
          unit: createMockUnit({ id: 'unit-grams', name: 'grams' }),
        },
      ],
    });

    // ACT: Calculate nutrition
    const result = calculateNutritionPerServing(recipe);

    // ASSERT: Verify the calculation
    // 400g * (165 cal/100g) / 4 servings = 165 calories per serving
    expect(result.calories).toBe(165);
    // 400g * (31g protein/100g) / 4 servings = 31g protein per serving
    expect(result.protein).toBe(31);
    // 400g * (3.6g fat/100g) / 4 servings = 3.6g fat per serving
    expect(result.fat).toBe(3.6);
    expect(result.carbs).toBe(0);
  });

  /**
   * HAPPY PATH: Multiple ingredients
   * 
   * Tests that the function correctly sums nutrition from multiple ingredients
   */
  it('should sum nutrition from multiple ingredients', () => {
    // Use the helper that creates a recipe with chicken + rice
    const recipe = createComplexMockRecipe();
    // Recipe has:
    // - 200g chicken (165 cal/100g) = 330 calories
    // - 1 cup rice (200g, 130 cal/100g) = 260 calories
    // Total: 590 calories for 2 servings = 295 calories per serving

    const result = calculateNutritionPerServing(recipe);

    expect(result.calories).toBe(295); // (330 + 260) / 2
    // Chicken: 200g * (31g/100g) = 62g protein
    // Rice: 200g * (2.7g/100g) = 5.4g protein
    // Total: 67.4g / 2 servings = 33.7g per serving (rounded to 33.7)
    expect(result.protein).toBe(33.7);
  });

  /**
   * EDGE CASE: Different units (cups, tablespoons, etc.)
   * 
   * Tests unit conversion works correctly
   */
  it('should convert different units to grams correctly', () => {
    const recipe = createMockRecipe({
      servings: 2,
      ingredients: [
        {
          id: 'ri-1',
          recipeId: 'recipe-1',
          ingredientId: 'ing-rice',
          unitId: 'unit-cup',
          amount: 1, // 1 cup
          excludeFromNutrition: false,
          additionalInfo: null,
          ingredient: createMockIngredient({
            id: 'ing-rice',
            name: 'Rice',
            calories: 130, // per 100g
            proteins: 2.7,
            fats: 0.3,
            carbs: 28,
            unitConversions: [
              createMockIngredientUnit('ing-rice', 'unit-cup', 200), // 1 cup = 200g
            ],
          }),
          unit: createMockUnit({ id: 'unit-cup', name: 'cup' }),
        },
      ],
    });

    const result = calculateNutritionPerServing(recipe);

    // 1 cup = 200g
    // 200g * (130 cal/100g) / 2 servings = 130 calories per serving
    expect(result.calories).toBe(130);
    // 200g * (2.7g/100g) / 2 servings = 2.7g protein per serving
    expect(result.protein).toBe(2.7);
  });

  /**
   * EDGE CASE: Excluded ingredients
   * 
   * Ingredients with excludeFromNutrition: true should not be counted
   */
  it('should exclude ingredients marked as excludeFromNutrition', () => {
    const recipe = createRecipeWithExcludedIngredients();
    // Recipe has:
    // - 200g chicken (should be counted)
    // - 5g salt with excludeFromNutrition: true (should NOT be counted)

    const result = calculateNutritionPerServing(recipe);

    // Should only count the chicken, not the salt
    // 200g * (165 cal/100g) / 2 servings = 165 calories per serving
    expect(result.calories).toBe(165);
    expect(result.protein).toBe(31); // Only chicken protein
  });

  /**
   * EDGE CASE: Null amounts
   * 
   * Ingredients with amount: null (e.g., "salt to taste") should be ignored
   */
  it('should ignore ingredients with null amounts', () => {
    const recipe = createRecipeWithNullAmounts();
    // Recipe has:
    // - 200g chicken (should be counted)
    // - null amount salt (should NOT be counted)

    const result = calculateNutritionPerServing(recipe);

    // Should only count the chicken
    expect(result.calories).toBe(165);
    expect(result.protein).toBe(31);
  });

  /**
   * EDGE CASE: Missing unit conversions
   * 
   * If an ingredient doesn't have a conversion for its unit, it should be skipped
   */
  it('should ignore ingredients without unit conversions', () => {
    const recipe = createRecipeWithMissingConversions();
    // Recipe has an ingredient with empty unitConversions array

    const result = calculateNutritionPerServing(recipe);

    // Should return zeros since we can't convert the unit
    expect(result.calories).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.fat).toBe(0);
    expect(result.carbs).toBe(0);
  });

  /**
   * EDGE CASE: Rounding
   * 
   * The function rounds to 1 decimal place - test that it works correctly
   */
  it('should round values to 1 decimal place', () => {
    const recipe = createMockRecipe({
      servings: 3, // Use 3 to get non-round numbers
      ingredients: [
        {
          id: 'ri-1',
          recipeId: 'recipe-1',
          ingredientId: 'ing-1',
          unitId: 'unit-grams',
          amount: 100, // 100g
          excludeFromNutrition: false,
          additionalInfo: null,
          ingredient: createMockIngredient({
            id: 'ing-1',
            calories: 165,
            proteins: 31,
            fats: 3.6,
            carbs: 0,
            unitConversions: [
              createMockIngredientUnit('ing-1', 'unit-grams', 1),
            ],
          }),
          unit: createMockUnit({ id: 'unit-grams', name: 'grams' }),
        },
      ],
    });

    const result = calculateNutritionPerServing(recipe);

    // 100g * (165 cal/100g) / 3 servings = 55 calories (exact)
    expect(result.calories).toBe(55);
    // 100g * (31g/100g) / 3 servings = 10.333... should round to 10.3
    expect(result.protein).toBe(10.3);
    // 100g * (3.6g/100g) / 3 servings = 1.2g (exact)
    expect(result.fat).toBe(1.2);
  });

  /**
   * EDGE CASE: Empty recipe (no ingredients)
   * 
   * What happens if a recipe has no ingredients?
   */
  it('should return zeros for recipe with no ingredients', () => {
    const recipe = createMinimalRecipe();
    // Recipe has empty ingredients array

    const result = calculateNutritionPerServing(recipe);

    expect(result.calories).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.fat).toBe(0);
    expect(result.carbs).toBe(0);
  });

  /**
   * EDGE CASE: Single serving
   * 
   * Test with recipe that serves 1 person
   */
  it('should calculate correctly for single serving', () => {
    const recipe = createMockRecipe({
      servings: 1,
      ingredients: [
        {
          id: 'ri-1',
          recipeId: 'recipe-1',
          ingredientId: 'ing-1',
          unitId: 'unit-grams',
          amount: 200, // 200g
          excludeFromNutrition: false,
          additionalInfo: null,
          ingredient: createMockIngredient({
            id: 'ing-1',
            calories: 165,
            proteins: 31,
            fats: 3.6,
            carbs: 0,
            unitConversions: [
              createMockIngredientUnit('ing-1', 'unit-grams', 1),
            ],
          }),
          unit: createMockUnit({ id: 'unit-grams', name: 'grams' }),
        },
      ],
    });

    const result = calculateNutritionPerServing(recipe);

    // 200g * (165 cal/100g) / 1 serving = 330 calories
    expect(result.calories).toBe(330);
    expect(result.protein).toBe(62); // 200g * (31g/100g) = 62g
  });

  /**
   * REALISTIC TEST: Complex recipe with multiple ingredients and edge cases
   * 
   * Tests a more realistic scenario with various ingredients
   */
  it('should handle complex recipe with mixed scenarios', () => {
    const recipe = createMockRecipe({
      servings: 4,
      ingredients: [
        // Regular ingredient
        {
          id: 'ri-1',
          recipeId: 'recipe-1',
          ingredientId: 'ing-chicken',
          unitId: 'unit-grams',
          amount: 400,
          excludeFromNutrition: false,
          additionalInfo: null,
          ingredient: createMockIngredient({
            id: 'ing-chicken',
            name: 'Chicken',
            calories: 165,
            proteins: 31,
            fats: 3.6,
            carbs: 0,
            unitConversions: [
              createMockIngredientUnit('ing-chicken', 'unit-grams', 1),
            ],
          }),
          unit: createMockUnit({ id: 'unit-grams', name: 'grams' }),
        },
        // Excluded ingredient (should be ignored)
        {
          id: 'ri-2',
          recipeId: 'recipe-1',
          ingredientId: 'ing-oil',
          unitId: 'unit-grams',
          amount: 20,
          excludeFromNutrition: true, // Should be excluded
          additionalInfo: null,
          ingredient: createMockIngredient({
            id: 'ing-oil',
            name: 'Oil',
            calories: 900,
            proteins: 0,
            fats: 100,
            carbs: 0,
            unitConversions: [
              createMockIngredientUnit('ing-oil', 'unit-grams', 1),
            ],
          }),
          unit: createMockUnit({ id: 'unit-grams', name: 'grams' }),
        },
        // Null amount (should be ignored)
        {
          id: 'ri-3',
          recipeId: 'recipe-1',
          ingredientId: 'ing-salt',
          unitId: 'unit-grams',
          amount: null, // "To taste" - should be ignored
          excludeFromNutrition: false,
          additionalInfo: null,
          ingredient: createMockIngredient({
            id: 'ing-salt',
            name: 'Salt',
            calories: 0,
            proteins: 0,
            fats: 0,
            carbs: 0,
            unitConversions: [
              createMockIngredientUnit('ing-salt', 'unit-grams', 1),
            ],
          }),
          unit: createMockUnit({ id: 'unit-grams', name: 'grams' }),
        },
      ],
    });

    const result = calculateNutritionPerServing(recipe);

    // Should only count the chicken (400g)
    // 400g * (165 cal/100g) / 4 servings = 165 calories per serving
    expect(result.calories).toBe(165);
    // Oil and salt should be ignored
    expect(result.protein).toBe(31);
    expect(result.fat).toBe(3.6);
  });
});

/**
 * TESTING scaleNutritionByCalories
 * 
 * This function scales nutrition values proportionally based on target calories.
 * 
 * Formula: scalingFactor = targetCalories / baseCalories
 *          scaledValue = baseValue * scalingFactor
 * 
 * All values are rounded to 1 decimal place.
 */
describe('scaleNutritionByCalories', () => {
  /**
   * HAPPY PATH: Scale up calories
   * 
   * If base is 200 cal and target is 400 cal, everything should double
   */
  it('should scale nutrition proportionally when increasing calories', () => {
    // ARRANGE
    const baseNutrition: NutritionPerPortion = {
      calories: 200,
      protein: 30,
      fat: 10,
      carbs: 20,
    };
    const targetCalories = 400; // Double the calories

    // ACT
    const result = scaleNutritionByCalories(baseNutrition, targetCalories);

    // ASSERT
    // Scaling factor = 400 / 200 = 2
    // Everything should double
    expect(result.calories).toBe(400); // 200 * 2
    expect(result.protein).toBe(60); // 30 * 2
    expect(result.fat).toBe(20); // 10 * 2
    expect(result.carbs).toBe(40); // 20 * 2
  });

  /**
   * HAPPY PATH: Scale down calories
   * 
   * If base is 400 cal and target is 200 cal, everything should halve
   */
  it('should scale nutrition proportionally when decreasing calories', () => {
    // ARRANGE
    const baseNutrition: NutritionPerPortion = {
      calories: 400,
      protein: 60,
      fat: 20,
      carbs: 40,
    };
    const targetCalories = 200; // Half the calories

    // ACT
    const result = scaleNutritionByCalories(baseNutrition, targetCalories);

    // ASSERT
    // Scaling factor = 200 / 400 = 0.5
    expect(result.calories).toBe(200);
    expect(result.protein).toBe(30);
    expect(result.fat).toBe(10);
    expect(result.carbs).toBe(20);
  });

  /**
   * EDGE CASE: Same calories (no scaling)
   * 
   * What if target equals base? Should return same values
   */
  it('should return same values when target equals base calories', () => {
    // ARRANGE
    const baseNutrition: NutritionPerPortion = {
      calories: 300,
      protein: 40,
      fat: 15,
      carbs: 25,
    };
    const targetCalories = 300; // Same as base

    // ACT
    const result = scaleNutritionByCalories(baseNutrition, targetCalories);

    // ASSERT
    // Scaling factor = 300 / 300 = 1
    // Everything should stay the same
    expect(result.calories).toBe(300);
    expect(result.protein).toBe(40);
    expect(result.fat).toBe(15);
    expect(result.carbs).toBe(25);
  });

  /**
   * EDGE CASE: Rounding
   * 
   * The function rounds to 1 decimal place - test that it works correctly
   */
  it('should round values to 1 decimal place', () => {
    // ARRANGE
    const baseNutrition: NutritionPerPortion = {
      calories: 100,
      protein: 33.333, // Will create a repeating decimal when scaled
      fat: 10,
      carbs: 20,
    };
    const targetCalories = 150; // 1.5x scaling

    // ACT
    const result = scaleNutritionByCalories(baseNutrition, targetCalories);

    // ASSERT
    // Scaling factor = 150 / 100 = 1.5
    // 33.333 * 1.5 = 49.9995, should round to 50.0
    expect(result.calories).toBe(150);
    expect(result.protein).toBe(50); // 33.333 * 1.5 = 49.9995 → 50.0
    expect(result.fat).toBe(15); // 10 * 1.5 = 15
    expect(result.carbs).toBe(30); // 20 * 1.5 = 30
  });

  /**
   * EDGE CASE: Very small scaling factor
   * 
   * What if we scale to a very small number?
   */
  it('should handle very small target calories', () => {
    // ARRANGE
    const baseNutrition: NutritionPerPortion = {
      calories: 1000,
      protein: 100,
      fat: 50,
      carbs: 100,
    };
    const targetCalories = 100; // 0.1x scaling (10% of original)

    // ACT
    const result = scaleNutritionByCalories(baseNutrition, targetCalories);

    // ASSERT
    // Scaling factor = 100 / 1000 = 0.1
    expect(result.calories).toBe(100);
    expect(result.protein).toBe(10); // 100 * 0.1 = 10
    expect(result.fat).toBe(5); // 50 * 0.1 = 5
    expect(result.carbs).toBe(10); // 100 * 0.1 = 10
  });

  /**
   * EDGE CASE: Very large scaling factor
   * 
   * What if we scale to a very large number?
   */
  it('should handle very large target calories', () => {
    // ARRANGE
    const baseNutrition: NutritionPerPortion = {
      calories: 200,
      protein: 20,
      fat: 10,
      carbs: 15,
    };
    const targetCalories = 1000; // 5x scaling

    // ACT
    const result = scaleNutritionByCalories(baseNutrition, targetCalories);

    // ASSERT
    // Scaling factor = 1000 / 200 = 5
    expect(result.calories).toBe(1000);
    expect(result.protein).toBe(100); // 20 * 5 = 100
    expect(result.fat).toBe(50); // 10 * 5 = 50
    expect(result.carbs).toBe(75); // 15 * 5 = 75
  });

  /**
   * REALISTIC TEST: Real-world scenario
   * 
   * Test with realistic nutrition values from a recipe
   */
  it('should work with realistic nutrition values', () => {
    // ARRANGE: Typical meal nutrition
    const baseNutrition: NutritionPerPortion = {
      calories: 450,
      protein: 35.5,
      fat: 18.2,
      carbs: 42.3,
    };
    const targetCalories = 600; // Want to increase to 600 cal

    // ACT
    const result = scaleNutritionByCalories(baseNutrition, targetCalories);

    // ASSERT
    // Scaling factor = 600 / 450 = 1.333...
    expect(result.calories).toBe(600);
    // 35.5 * 1.333... = 47.333... → 47.3
    expect(result.protein).toBe(47.3);
    // 18.2 * 1.333... = 24.266... → 24.3
    expect(result.fat).toBe(24.3);
    // 42.3 * 1.333... = 56.4 → 56.4
    expect(result.carbs).toBe(56.4);
  });

  /**
   * EDGE CASE: Fractional scaling
   * 
   * Test with non-round scaling factors
   */
  it('should handle fractional scaling factors correctly', () => {
    // ARRANGE
    const baseNutrition: NutritionPerPortion = {
      calories: 300,
      protein: 25,
      fat: 12,
      carbs: 30,
    };
    const targetCalories = 250; // 0.833...x scaling

    // ACT
    const result = scaleNutritionByCalories(baseNutrition, targetCalories);

    // ASSERT
    // Scaling factor = 250 / 300 = 0.833...
    expect(result.calories).toBe(250);
    // 25 * 0.833... = 20.833... → 20.8
    expect(result.protein).toBe(20.8);
    // 12 * 0.833... = 10 → 10.0
    expect(result.fat).toBe(10);
    // 30 * 0.833... = 25 → 25.0
    expect(result.carbs).toBe(25);
  });
});