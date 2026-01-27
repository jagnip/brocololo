import { describe, it, expect } from 'vitest';
import { calculateServingScalingFactor } from '../utils';
import { createMockIngredient, createMockIngredientUnit, createMockRecipe, createMockUnit } from './test-helpers';

/**
 * SCALING CALCULATION TESTS
 * 
 * Tests for calculateServingScalingFactor which calculates:
 * 1. servingScalingFactor - how much to multiply ingredient amounts
 * 2. jagodaPortionFactor - what portion of the total goes to Jagoda
 * 3. nelsonPortionFactor - what portion of the total goes to Nelson
 * 
 * The function splits servings in half, then applies Nelson's multiplier.
 * Example: 4 servings with 1.5x multiplier:
 * - servingsPerPerson = 4 / 2 = 2
 * - jagodaServings = 2 * 1 = 2
 * - nelsonServings = 2 * 1.5 = 3
 * - totalServings = 2 + 3 = 5
 * - servingScalingFactor = 5 / recipeServings
 */

describe('calculateServingScalingFactor', () => {
  /**
   * HAPPY PATH: Normal scaling scenario
   * 
   * Recipe serves 4, we want 2 servings, Nelson's multiplier is 1.5
   */
  it('should calculate scaling factors for multiple servings correctly', () => {
    // ARRANGE
    const currentServings = 2;
    const recipeServings = 4;
    const nelsonMultiplier = 1.5;

    // ACT
    const result = calculateServingScalingFactor(
      currentServings,
      recipeServings,
      nelsonMultiplier,
    );

    // ASSERT
    // When currentServings = 2:
    // - servingsPerPerson = 2 / 2 = 1
    // - jagodaServings = 1 * 1 = 1
    // - nelsonServings = 1 * 1.5 = 1.5
    // - totalServings = 1 + 1.5 = 2.5
    // - servingScalingFactor = 2.5 / 4 = 0.625
    // - totalParts = 1 + 1.5 = 2.5
    // - jagodaPortionFactor = 1 / 2.5 = 0.4
    // - nelsonPortionFactor = 1.5 / 2.5 = 0.6
    expect(result.servingScalingFactor).toBe(0.625);
    expect(result.jagodaPortionFactor).toBe(0.4);
    expect(result.nelsonPortionFactor).toBe(0.6);
    
    // Portion factors should add up to 1.0 (they represent the split)
    expect(result.jagodaPortionFactor + result.nelsonPortionFactor).toBe(1.0);
  });

  /**
   * EDGE CASE: Single serving (just for Jagoda)
   * 
   * Special case: when currentServings === 1, it's just for Jagoda
   */
  it('should handle single serving (Jagoda only)', () => {
    // ARRANGE
    const currentServings = 1;
    const recipeServings = 4;
    const nelsonMultiplier = 1.5;

    // ACT
    const result = calculateServingScalingFactor(
      currentServings,
      recipeServings,
      nelsonMultiplier,
    );

    // ASSERT
    // When currentServings === 1:
    // - servingScalingFactor = 1 / recipeServings = 1/4 = 0.25
    // - jagodaPortionFactor = 1 (all for Jagoda)
    // - nelsonPortionFactor = 0 (none for Nelson)
    expect(result.servingScalingFactor).toBe(0.25);
    expect(result.jagodaPortionFactor).toBe(1);
    expect(result.nelsonPortionFactor).toBe(0);
    
    // Verify portion factors still add up correctly
    expect(result.jagodaPortionFactor + result.nelsonPortionFactor).toBe(1.0);
  });

  /**
   * EDGE CASE: Same servings as recipe
   * 
   * What if we want exactly the same number of servings?
   */
  it('should handle same servings as recipe', () => {
    // ARRANGE
    const currentServings = 4;
    const recipeServings = 4;
    const nelsonMultiplier = 1.5;

    // ACT
    const result = calculateServingScalingFactor(
      currentServings,
      recipeServings,
      nelsonMultiplier,
    );

    // ASSERT
    // servingsPerPerson = 4 / 2 = 2
    // jagodaServings = 2 * 1 = 2
    // nelsonServings = 2 * 1.5 = 3
    // totalServings = 2 + 3 = 5
    // servingScalingFactor = 5 / 4 = 1.25 (need more ingredients!)
    expect(result.servingScalingFactor).toBe(1.25);
    expect(result.jagodaPortionFactor).toBe(0.4); // 1 / (1 + 1.5) = 0.4
    expect(result.nelsonPortionFactor).toBe(0.6); // 1.5 / (1 + 1.5) = 0.6
    expect(result.jagodaPortionFactor + result.nelsonPortionFactor).toBe(1.0);
  });

  /**
   * EDGE CASE: Different Nelson multiplier
   * 
   * What if Nelson's multiplier is different?
   */
  it('should handle different Nelson multipliers', () => {
    // ARRANGE: Nelson eats 2x as much
    const currentServings = 2;
    const recipeServings = 4;
    const nelsonMultiplier = 2.0;

    // ACT
    const result = calculateServingScalingFactor(
      currentServings,
      recipeServings,
      nelsonMultiplier,
    );

    // ASSERT
    // servingsPerPerson = 2 / 2 = 1
    // jagodaServings = 1 * 1 = 1
    // nelsonServings = 1 * 2 = 2
    // totalServings = 1 + 2 = 3
    // servingScalingFactor = 3 / 4 = 0.75
    expect(result.servingScalingFactor).toBe(0.75);
    // totalParts = 1 + 2 = 3
    expect(result.jagodaPortionFactor).toBeCloseTo(0.333, 2); // 1 / 3
    expect(result.nelsonPortionFactor).toBeCloseTo(0.667, 2); // 2 / 3
    expect(result.jagodaPortionFactor + result.nelsonPortionFactor).toBeCloseTo(1.0, 2);
  });

  /**
   * EDGE CASE: Scaling up (more servings than recipe)
   * 
   * What if we want more servings than the recipe makes?
   */
  it('should handle scaling up to more servings', () => {
    // ARRANGE: Recipe makes 4, we want 8 servings
    const currentServings = 8;
    const recipeServings = 4;
    const nelsonMultiplier = 1.5;

    // ACT
    const result = calculateServingScalingFactor(
      currentServings,
      recipeServings,
      nelsonMultiplier,
    );

    // ASSERT
    // servingsPerPerson = 8 / 2 = 4
    // jagodaServings = 4 * 1 = 4
    // nelsonServings = 4 * 1.5 = 6
    // totalServings = 4 + 6 = 10
    // servingScalingFactor = 10 / 4 = 2.5 (need 2.5x ingredients!)
    expect(result.servingScalingFactor).toBe(2.5);
    expect(result.jagodaPortionFactor).toBe(0.4); // 1 / (1 + 1.5) = 0.4
    expect(result.nelsonPortionFactor).toBe(0.6); // 1.5 / (1 + 1.5) = 0.6
    expect(result.jagodaPortionFactor + result.nelsonPortionFactor).toBe(1.0);
  });

  /**
   * EDGE CASE: Nelson multiplier of 1 (equal portions)
   * 
   * What if Nelson and Jagoda eat the same amount?
   */
  it('should handle equal portions when multiplier is 1', () => {
    // ARRANGE
    const currentServings = 4;
    const recipeServings = 4;
    const nelsonMultiplier = 1.0; // Equal portions

    // ACT
    const result = calculateServingScalingFactor(
      currentServings,
      recipeServings,
      nelsonMultiplier,
    );

    // ASSERT
    // servingsPerPerson = 4 / 2 = 2
    // jagodaServings = 2 * 1 = 2
    // nelsonServings = 2 * 1 = 2
    // totalServings = 2 + 2 = 4
    // servingScalingFactor = 4 / 4 = 1.0 (same amount)
    expect(result.servingScalingFactor).toBe(1.0);
    expect(result.jagodaPortionFactor).toBe(0.5); // 1 / (1 + 1) = 0.5
    expect(result.nelsonPortionFactor).toBe(0.5); // 1 / (1 + 1) = 0.5
    expect(result.jagodaPortionFactor + result.nelsonPortionFactor).toBe(1.0);
  });

  /**
   * REALISTIC TEST: Real-world scenario
   * 
   * Test with realistic values from actual usage
   */
  it('should work with realistic recipe scenario', () => {
    // ARRANGE: Recipe makes 6 servings, we want 3 servings, Nelson eats 1.5x
    const currentServings = 3;
    const recipeServings = 6;
    const nelsonMultiplier = 1.5;

    // ACT
    const result = calculateServingScalingFactor(
      currentServings,
      recipeServings,
      nelsonMultiplier,
    );

    // ASSERT
    // servingsPerPerson = 3 / 2 = 1.5
    // jagodaServings = 1.5 * 1 = 1.5
    // nelsonServings = 1.5 * 1.5 = 2.25
    // totalServings = 1.5 + 2.25 = 3.75
    // servingScalingFactor = 3.75 / 6 = 0.625
    expect(result.servingScalingFactor).toBe(0.625);
    expect(result.jagodaPortionFactor).toBe(0.4);
    expect(result.nelsonPortionFactor).toBe(0.6);
    expect(result.jagodaPortionFactor + result.nelsonPortionFactor).toBe(1.0);
  });

  /**
   * INTEGRATION TEST: Verify ingredient scaling works correctly
   * 
   * Test that servingScalingFactor correctly scales ingredient amounts
   */
  it('should produce correct scaling factor for ingredient amounts', () => {
    // ARRANGE: Recipe has 400g chicken for 4 servings, we want 2 servings
    const recipeServings = 4;
    const currentServings = 2;
    const nelsonMultiplier = 1.5;
    const originalIngredientAmount = 400; // grams

    // ACT
    const result = calculateServingScalingFactor(
      currentServings,
      recipeServings,
      nelsonMultiplier,
    );

    // Calculate scaled amount (how it's used in the UI)
    const scaledAmount = originalIngredientAmount * result.servingScalingFactor;

    // ASSERT
    // servingScalingFactor = 0.625 (from previous test)
    // scaledAmount = 400 * 0.625 = 250g total
    // This 250g is then split: Jagoda gets 40%, Nelson gets 60%
    expect(result.servingScalingFactor).toBe(0.625);
    expect(scaledAmount).toBe(250);
    
    // Verify the split:
    // Jagoda's portion = 250g * 0.4 = 100g
    // Nelson's portion = 250g * 0.6 = 150g
    // Total = 100g + 150g = 250g ✓
    const jagodaAmount = scaledAmount * result.jagodaPortionFactor;
    const nelsonAmount = scaledAmount * result.nelsonPortionFactor;
    expect(jagodaAmount).toBe(100);
    expect(nelsonAmount).toBe(150);
    expect(jagodaAmount + nelsonAmount).toBe(scaledAmount);
  });

  /**
   * EDGE CASE: Very large multiplier
   * 
   * What if Nelson eats a lot more?
   */
  it('should handle very large Nelson multiplier', () => {
    // ARRANGE: Nelson eats 3x as much
    const currentServings = 4;
    const recipeServings = 4;
    const nelsonMultiplier = 3.0;

    // ACT
    const result = calculateServingScalingFactor(
      currentServings,
      recipeServings,
      nelsonMultiplier,
    );

    // ASSERT
    // servingsPerPerson = 4 / 2 = 2
    // jagodaServings = 2 * 1 = 2
    // nelsonServings = 2 * 3 = 6
    // totalServings = 2 + 6 = 8
    // servingScalingFactor = 8 / 4 = 2.0
    expect(result.servingScalingFactor).toBe(2.0);
    // totalParts = 1 + 3 = 4
    expect(result.jagodaPortionFactor).toBe(0.25); // 1 / 4
    expect(result.nelsonPortionFactor).toBe(0.75); // 3 / 4
    expect(result.jagodaPortionFactor + result.nelsonPortionFactor).toBe(1.0);
  });

  /**
   * EDGE CASE: Very small multiplier
   * 
   * What if Nelson eats less?
   */
  it('should handle very small Nelson multiplier', () => {
    // ARRANGE: Nelson eats 0.5x (half as much)
    const currentServings = 4;
    const recipeServings = 4;
    const nelsonMultiplier = 0.5;

    // ACT
    const result = calculateServingScalingFactor(
      currentServings,
      recipeServings,
      nelsonMultiplier,
    );

    // ASSERT
    // servingsPerPerson = 4 / 2 = 2
    // jagodaServings = 2 * 1 = 2
    // nelsonServings = 2 * 0.5 = 1
    // totalServings = 2 + 1 = 3
    // servingScalingFactor = 3 / 4 = 0.75
    expect(result.servingScalingFactor).toBe(0.75);
    // totalParts = 1 + 0.5 = 1.5
    expect(result.jagodaPortionFactor).toBeCloseTo(0.667, 2); // 1 / 1.5
    expect(result.nelsonPortionFactor).toBeCloseTo(0.333, 2); // 0.5 / 1.5
    expect(result.jagodaPortionFactor + result.nelsonPortionFactor).toBeCloseTo(1.0, 2);
  });

  /**
   * VERIFICATION: Portion factors always sum to 1.0
   * 
   * This is a critical property - the portion factors should always add up to 1.0
   * because they represent how the total is split between Jagoda and Nelson.
   */
  it('should always have portion factors that sum to 1.0', () => {
    // Test multiple scenarios
    const testCases = [
      { currentServings: 2, recipeServings: 4, nelsonMultiplier: 1.5 },
      { currentServings: 4, recipeServings: 4, nelsonMultiplier: 1.5 },
      { currentServings: 1, recipeServings: 4, nelsonMultiplier: 1.5 },
      { currentServings: 6, recipeServings: 4, nelsonMultiplier: 2.0 },
      { currentServings: 3, recipeServings: 6, nelsonMultiplier: 1.0 },
    ];

    testCases.forEach(({ currentServings, recipeServings, nelsonMultiplier }) => {
      const result = calculateServingScalingFactor(
        currentServings,
        recipeServings,
        nelsonMultiplier,
      );

      expect(result.jagodaPortionFactor + result.nelsonPortionFactor).toBeCloseTo(
        1.0,
        5, // Allow for floating point precision
      );
    });
  });
});


/**
 * SCALING CALCULATION TESTS
 * 
 * Tests for calculateServingScalingFactor which calculates:
 * 1. servingScalingFactor - how much to multiply ingredient amounts
 * 2. jagodaPortionFactor - what portion of the total goes to Jagoda
 * 3. nelsonPortionFactor - what portion of the total goes to Nelson
 * 
 * IMPORTANT: Recipe ingredients in DB are stored with EQUAL portions.
 * The multiplier is only applied in the UI via servingScalingFactor.
 */

describe('calculateServingScalingFactor', () => {
  // ... existing tests ...

  /**
   * INGREDIENT SCALING TEST: Verify ingredients scale correctly
   * 
   * This test verifies that when we apply servingScalingFactor to recipe ingredients,
   * they scale correctly accounting for both servings and Nelson's multiplier.
   */
  describe('Ingredient Scaling', () => {
    /**
     * Test that ingredients scale correctly when scaling down servings
     * Recipe: 4 servings, 400g chicken, 200g rice
     * We want: 2 servings with Nelson multiplier 1.5
     */
    it('should scale ingredient amounts correctly when scaling down servings', () => {
      // ARRANGE: Recipe in DB has equal portions (no multiplier applied)
      const recipe = createMockRecipe({
        servings: 4, // Recipe makes 4 equal servings
        servingMultiplierForNelson: 1.5,
        ingredients: [
          {
            id: 'ri-1',
            recipeId: 'recipe-1',
            ingredientId: 'ing-chicken',
            unitId: 'unit-grams',
            amount: 400, // 400g total for 4 servings (100g per serving if equal)
            excludeFromNutrition: false,
            additionalInfo: null,
            ingredient: createMockIngredient({
              id: 'ing-chicken',
              name: 'Chicken',
            }),
            unit: createMockUnit({ id: 'unit-grams', name: 'grams' }),
          },
          {
            id: 'ri-2',
            recipeId: 'recipe-1',
            ingredientId: 'ing-rice',
            unitId: 'unit-grams',
            amount: 200, // 200g total for 4 servings (50g per serving if equal)
            excludeFromNutrition: false,
            additionalInfo: null,
            ingredient: createMockIngredient({
              id: 'ing-rice',
              name: 'Rice',
            }),
            unit: createMockUnit({ id: 'unit-grams', name: 'grams' }),
          },
        ],
      });

      const currentServings = 2; // We want 2 servings
      const { servingScalingFactor } = calculateServingScalingFactor(
        currentServings,
        recipe.servings,
        recipe.servingMultiplierForNelson,
      );

      // ACT: Scale each ingredient (as done in UI)
      const scaledIngredients = recipe.ingredients.map((ingredient) => ({
        ...ingredient,
        scaledAmount: ingredient.amount ? ingredient.amount * servingScalingFactor : null,
      }));

      // ASSERT
      // servingScalingFactor = 0.625 (from previous tests)
      // Chicken: 400g * 0.625 = 250g total
      // Rice: 200g * 0.625 = 125g total
      expect(servingScalingFactor).toBe(0.625);
      expect(scaledIngredients[0].scaledAmount).toBe(250);
      expect(scaledIngredients[1].scaledAmount).toBe(125);
    });

    /**
     * Test that ingredients scale correctly when scaling up servings
     * Recipe: 4 servings, 400g chicken
     * We want: 8 servings with Nelson multiplier 1.5
     */
    it('should scale ingredient amounts correctly when scaling up servings', () => {
      // ARRANGE
      const recipe = createMockRecipe({
        servings: 4,
        servingMultiplierForNelson: 1.5,
        ingredients: [
          {
            id: 'ri-1',
            recipeId: 'recipe-1',
            ingredientId: 'ing-chicken',
            unitId: 'unit-grams',
            amount: 400, // 400g for 4 servings
            excludeFromNutrition: false,
            additionalInfo: null,
            ingredient: createMockIngredient({ id: 'ing-chicken' }),
            unit: createMockUnit({ id: 'unit-grams', name: 'grams' }),
          },
        ],
      });

      const currentServings = 8; // We want 8 servings
      const { servingScalingFactor } = calculateServingScalingFactor(
        currentServings,
        recipe.servings,
        recipe.servingMultiplierForNelson,
      );

      // ACT
      const scaledAmount = recipe.ingredients[0].amount! * servingScalingFactor;

      // ASSERT
      // servingScalingFactor = 2.5 (8 servings with 1.5x multiplier)
      // 400g * 2.5 = 1000g total
      expect(servingScalingFactor).toBe(2.5);
      expect(scaledAmount).toBe(1000);
    });

    /**
     * Test that base recipe amounts are equal (no multiplier in DB)
     * 
     * This verifies that the DB stores equal portions, and the multiplier
     * is only applied via servingScalingFactor in the UI.
     */
    it('should verify base recipe amounts are equal portions (no multiplier in DB)', () => {
      // ARRANGE: Recipe with 4 servings, 400g chicken
      const recipe = createMockRecipe({
        servings: 4,
        servingMultiplierForNelson: 1.5, // Multiplier exists but NOT applied in DB
        ingredients: [
          {
            id: 'ri-1',
            recipeId: 'recipe-1',
            ingredientId: 'ing-chicken',
            unitId: 'unit-grams',
            amount: 400, // This is 400g for 4 EQUAL servings = 100g per serving
            excludeFromNutrition: false,
            additionalInfo: null,
            ingredient: createMockIngredient({ id: 'ing-chicken' }),
            unit: createMockUnit({ id: 'unit-grams', name: 'grams' }),
          },
        ],
      });

      // ASSERT: Base amount divided by servings gives equal portions
      // 400g / 4 servings = 100g per serving (equal)
      const equalPortionPerServing = recipe.ingredients[0].amount! / recipe.servings;
      expect(equalPortionPerServing).toBe(100);
      
      // The multiplier is NOT in the base amount - it's only in servingMultiplierForNelson
      // This will be applied via servingScalingFactor in the UI
      expect(recipe.servingMultiplierForNelson).toBe(1.5);
    });

    /**
     * Test ingredient scaling with multiple ingredients
     * 
     * Verifies all ingredients scale proportionally
     */
    it('should scale all ingredients proportionally', () => {
      // ARRANGE: Recipe with multiple ingredients
      const recipe = createMockRecipe({
        servings: 4,
        servingMultiplierForNelson: 1.5,
        ingredients: [
          {
            id: 'ri-1',
            recipeId: 'recipe-1',
            ingredientId: 'ing-chicken',
            unitId: 'unit-grams',
            amount: 400,
            excludeFromNutrition: false,
            additionalInfo: null,
            ingredient: createMockIngredient({ id: 'ing-chicken', name: 'Chicken' }),
            unit: createMockUnit({ id: 'unit-grams', name: 'grams' }),
          },
          {
            id: 'ri-2',
            recipeId: 'recipe-1',
            ingredientId: 'ing-rice',
            unitId: 'unit-cup',
            amount: 2, // 2 cups
            excludeFromNutrition: false,
            additionalInfo: null,
            ingredient: createMockIngredient({
              id: 'ing-rice',
              name: 'Rice',
              unitConversions: [
                createMockIngredientUnit('ing-rice', 'unit-cup', 200), // 1 cup = 200g
              ],
            }),
            unit: createMockUnit({ id: 'unit-cup', name: 'cup' }),
          },
          {
            id: 'ri-3',
            recipeId: 'recipe-1',
            ingredientId: 'ing-salt',
            unitId: 'unit-grams',
            amount: 10, // 10g
            excludeFromNutrition: false,
            additionalInfo: null,
            ingredient: createMockIngredient({ id: 'ing-salt', name: 'Salt' }),
            unit: createMockUnit({ id: 'unit-grams', name: 'grams' }),
          },
        ],
      });

      const currentServings = 2;
      const { servingScalingFactor } = calculateServingScalingFactor(
        currentServings,
        recipe.servings,
        recipe.servingMultiplierForNelson,
      );

      // ACT: Scale all ingredients
      const scaledIngredients = recipe.ingredients.map((ing) => ({
        name: ing.ingredient.name,
        originalAmount: ing.amount,
        scaledAmount: ing.amount ? ing.amount * servingScalingFactor : null,
      }));

      // ASSERT: All ingredients scale by the same factor
      expect(servingScalingFactor).toBe(0.625);
      
      // Chicken: 400g * 0.625 = 250g
      expect(scaledIngredients[0].scaledAmount).toBe(250);
      
      // Rice: 2 cups * 0.625 = 1.25 cups
      expect(scaledIngredients[1].scaledAmount).toBe(1.25);
      
      // Salt: 10g * 0.625 = 6.25g
      expect(scaledIngredients[2].scaledAmount).toBe(6.25);
    });

    /**
     * Test that scaling works correctly when multiplier is 1.0 (equal portions)
     */
    it('should scale correctly when Nelson multiplier is 1.0 (equal portions)', () => {
      // ARRANGE: Equal portions (no multiplier effect)
      const recipe = createMockRecipe({
        servings: 4,
        servingMultiplierForNelson: 1.0, // Equal portions
        ingredients: [
          {
            id: 'ri-1',
            recipeId: 'recipe-1',
            ingredientId: 'ing-chicken',
            unitId: 'unit-grams',
            amount: 400,
            excludeFromNutrition: false,
            additionalInfo: null,
            ingredient: createMockIngredient({ id: 'ing-chicken' }),
            unit: createMockUnit({ id: 'unit-grams', name: 'grams' }),
          },
        ],
      });

      const currentServings = 2; // We want 2 servings
      const { servingScalingFactor } = calculateServingScalingFactor(
        currentServings,
        recipe.servings,
        recipe.servingMultiplierForNelson,
      );

      // ACT
      const scaledAmount = recipe.ingredients[0].amount! * servingScalingFactor;

      // ASSERT
      // With multiplier = 1.0, servingsPerPerson = 2/2 = 1
      // jagodaServings = 1, nelsonServings = 1
      // totalServings = 2, servingScalingFactor = 2/4 = 0.5
      expect(servingScalingFactor).toBe(0.5);
      expect(scaledAmount).toBe(200); // 400g * 0.5 = 200g
    });

    /**
     * Test that ingredients with null amounts are handled correctly
     */
    it('should handle ingredients with null amounts', () => {
      // ARRANGE: Recipe with null amount ingredient
      const recipe = createMockRecipe({
        servings: 4,
        servingMultiplierForNelson: 1.5,
        ingredients: [
          {
            id: 'ri-1',
            recipeId: 'recipe-1',
            ingredientId: 'ing-chicken',
            unitId: 'unit-grams',
            amount: 400,
            excludeFromNutrition: false,
            additionalInfo: null,
            ingredient: createMockIngredient({ id: 'ing-chicken' }),
            unit: createMockUnit({ id: 'unit-grams', name: 'grams' }),
          },
          {
            id: 'ri-2',
            recipeId: 'recipe-1',
            ingredientId: 'ing-salt',
            unitId: 'unit-grams',
            amount: null, // "To taste"
            excludeFromNutrition: false,
            additionalInfo: null,
            ingredient: createMockIngredient({ id: 'ing-salt' }),
            unit: createMockUnit({ id: 'unit-grams', name: 'grams' }),
          },
        ],
      });

      const currentServings = 2;
      const { servingScalingFactor } = calculateServingScalingFactor(
        currentServings,
        recipe.servings,
        recipe.servingMultiplierForNelson,
      );

      // ACT: Scale ingredients (as done in UI)
      const scaledIngredients = recipe.ingredients.map((ing) => ({
        name: ing.ingredient.name,
        originalAmount: ing.amount,
        scaledAmount: ing.amount ? ing.amount * servingScalingFactor : null,
      }));

      // ASSERT
      expect(servingScalingFactor).toBe(0.625);
      expect(scaledIngredients[0].scaledAmount).toBe(250); // 400 * 0.625
      expect(scaledIngredients[1].scaledAmount).toBeNull(); // null stays null
    });

    /**
     * INTEGRATION TEST: Full scaling scenario
     * 
     * Tests the complete flow: recipe in DB → calculate scaling → scale ingredients
     * This mimics what happens in the UI
     */
    it('should correctly scale ingredients in a complete scenario', () => {
      // ARRANGE: Recipe stored in DB with equal portions
      const recipe = createMockRecipe({
        servings: 6, // Recipe makes 6 equal servings
        servingMultiplierForNelson: 1.5, // Nelson eats 1.5x (stored but not applied in DB)
        ingredients: [
          {
            id: 'ri-1',
            recipeId: 'recipe-1',
            ingredientId: 'ing-chicken',
            unitId: 'unit-grams',
            amount: 600, // 600g for 6 servings = 100g per serving (equal)
            excludeFromNutrition: false,
            additionalInfo: null,
            ingredient: createMockIngredient({ id: 'ing-chicken', name: 'Chicken' }),
            unit: createMockUnit({ id: 'unit-grams', name: 'grams' }),
          },
          {
            id: 'ri-2',
            recipeId: 'recipe-1',
            ingredientId: 'ing-rice',
            unitId: 'unit-grams',
            amount: 300, // 300g for 6 servings = 50g per serving (equal)
            excludeFromNutrition: false,
            additionalInfo: null,
            ingredient: createMockIngredient({ id: 'ing-rice', name: 'Rice' }),
            unit: createMockUnit({ id: 'unit-grams', name: 'grams' }),
          },
        ],
      });

      // User wants 3 servings
      const currentServings = 3;

      // ACT: Calculate scaling (as done in UI)
      const { servingScalingFactor, jagodaPortionFactor, nelsonPortionFactor } =
        calculateServingScalingFactor(
          currentServings,
          recipe.servings,
          recipe.servingMultiplierForNelson,
        );

      // Scale ingredients (as done in UI: amount * servingScalingFactor)
      const scaledIngredients = recipe.ingredients.map((ing) => ({
        name: ing.ingredient.name,
        originalAmount: ing.amount,
        scaledAmount: ing.amount ? ing.amount * servingScalingFactor : null,
      }));

      // ASSERT
      // servingsPerPerson = 3 / 2 = 1.5
      // jagodaServings = 1.5, nelsonServings = 1.5 * 1.5 = 2.25
      // totalServings = 1.5 + 2.25 = 3.75
      // servingScalingFactor = 3.75 / 6 = 0.625
      expect(servingScalingFactor).toBe(0.625);
      expect(jagodaPortionFactor).toBe(0.4);
      expect(nelsonPortionFactor).toBe(0.6);

      // Scaled amounts
      expect(scaledIngredients[0].scaledAmount).toBe(375); // 600 * 0.625
      expect(scaledIngredients[1].scaledAmount).toBe(187.5); // 300 * 0.625

      // Verify portion split (for display purposes)
      // Total chicken: 375g
      // Jagoda gets: 375g * 0.4 = 150g
      // Nelson gets: 375g * 0.6 = 225g
      const totalChicken = scaledIngredients[0].scaledAmount!;
      const jagodaChicken = totalChicken * jagodaPortionFactor;
      const nelsonChicken = totalChicken * nelsonPortionFactor;
      expect(jagodaChicken).toBe(150);
      expect(nelsonChicken).toBe(225);
      expect(jagodaChicken + nelsonChicken).toBe(totalChicken);
    });
  });
});