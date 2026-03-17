import { describe, it, expect } from 'vitest';
import {
  scaleNutrition,
  computeManualScaleRatio,
  getIngredientDisplay,
  calculateNutritionPerServing,
  calculateServingScalingFactor,
  type NutritionPerPortion,
} from '../recipes/helpers';
import {
  createMockRecipe,
  createMockIngredient,
  createMockIngredientUnit,
  createMockUnit,
} from './test-helpers';

// ============================================================================
// scaleNutrition
// ============================================================================

describe('scaleNutrition', () => {
  const base: NutritionPerPortion = {
    calories: 300,
    protein: 25,
    fat: 12,
    carbs: 40,
  };

  it('should return identical values when factor is 1', () => {
    const result = scaleNutrition(base, 1);
    expect(result).toEqual(base);
  });

  it('should double all values when factor is 2', () => {
    const result = scaleNutrition(base, 2);
    expect(result.calories).toBe(600);
    expect(result.protein).toBe(50);
    expect(result.fat).toBe(24);
    expect(result.carbs).toBe(80);
  });

  it('should halve all values when factor is 0.5', () => {
    const result = scaleNutrition(base, 0.5);
    expect(result.calories).toBe(150);
    expect(result.protein).toBe(12.5);
    expect(result.fat).toBe(6);
    expect(result.carbs).toBe(20);
  });

  it('should round to 1 decimal place', () => {
    // 300 * (1/3) = 100, 25 * (1/3) = 8.333, 12 * (1/3) = 4, 40 * (1/3) = 13.333
    const result = scaleNutrition(base, 1 / 3);
    expect(result.calories).toBe(100);
    expect(result.protein).toBe(8.3);
    expect(result.fat).toBe(4);
    expect(result.carbs).toBe(13.3);
  });

  it('should handle zero values in base nutrition', () => {
    const zeroBase: NutritionPerPortion = {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    };
    const result = scaleNutrition(zeroBase, 5);
    expect(result).toEqual(zeroBase);
  });
});

// ============================================================================
// computeManualScaleRatio
// ============================================================================

describe('computeManualScaleRatio', () => {
  it('should return the edit ratio when no prior scaling exists', () => {
    // No calorie target (factor=1), no prior manual edit (ratio=1)
    // User scales 1.5x → new ratio should be 1.5
    const result = computeManualScaleRatio(1.5, 1, 1);
    expect(result).toBe(1.5);
  });

  it('should absorb calorie scaling factor when ingredient is edited', () => {
    // Calorie target active (factor=0.8), no prior manual edit
    // User scales 1.25x → absorbs 0.8: new ratio = 0.8 * 1 * 1.25 = 1.0
    const result = computeManualScaleRatio(1.25, 0.8, 1);
    expect(result).toBe(1);
  });

  it('should compound with existing manual scale ratio', () => {
    // No calorie target, prior manual edit of 1.5x
    // User now scales 2x on top → new ratio = 1 * 1.5 * 2 = 3
    const result = computeManualScaleRatio(2, 1, 1.5);
    expect(result).toBe(3);
  });

  it('should absorb both calorie factor and prior manual ratio', () => {
    // Calorie target 0.8, prior manual ratio 1.2, new edit 1.5x
    // new = 0.8 * 1.2 * 1.5 = 1.44
    const result = computeManualScaleRatio(1.5, 0.8, 1.2);
    expect(result).toBeCloseTo(1.44);
  });

  it('should handle ratio of 1 (no change) as identity', () => {
    const result = computeManualScaleRatio(1, 0.8, 1.5);
    // 0.8 * 1.5 * 1 = 1.2
    expect(result).toBeCloseTo(1.2);
  });
});

// ============================================================================
// getIngredientDisplay — rawAmount
// ============================================================================

describe('getIngredientDisplay rawAmount', () => {
  const gramsUnit = { unitId: 'unit-grams', gramsPerUnit: 1, unit: { id: 'unit-grams', name: 'grams' } };
  const cupUnit = { unitId: 'unit-cup', gramsPerUnit: 200, unit: { id: 'unit-cup', name: 'cup' } };

  it('should return rawAmount as unrounded numeric value', () => {
    // 100g * (1/3 scaling) = 33.333...
    const result = getIngredientDisplay(
      100, 'unit-grams', 'grams', 'unit-grams', [gramsUnit], 1 / 3, 1,
    );
    expect(result.displayAmount).toBe('33.33');
    expect(result.rawAmount).toBeCloseTo(33.333, 2);
  });

  it('should return null rawAmount when amount is null', () => {
    const result = getIngredientDisplay(
      null, 'unit-grams', 'grams', 'unit-grams', [gramsUnit], 1, 1,
    );
    expect(result.rawAmount).toBeNull();
    expect(result.displayAmount).toBeNull();
  });

  it('should return rawAmount in the selected display unit', () => {
    // 400g in original unit, display in cups (200g/cup)
    // scaled = 400 * 1 * 1 = 400g, converted = 400 * (1/200) = 2 cups
    const result = getIngredientDisplay(
      400, 'unit-grams', 'grams', 'unit-cup', [gramsUnit, cupUnit], 1, 1,
    );
    expect(result.rawAmount).toBe(2);
    expect(result.displayAmount).toBe('2');
  });

  it('should apply both scaling factors to rawAmount', () => {
    // 200g * servingScale(0.5) * calorieScale(0.8) = 80g
    const result = getIngredientDisplay(
      200, 'unit-grams', 'grams', 'unit-grams', [gramsUnit], 0.5, 0.8,
    );
    expect(result.rawAmount).toBe(80);
    expect(result.displayAmount).toBe('80');
  });
});

// ============================================================================
// Manual ingredient scaling — integration scenarios
// ============================================================================

describe('Manual ingredient scaling — integration', () => {
  /**
   * Recipe: 400g chicken + 300g rice, 4 servings, Nelson multiplier 1.5
   * Chicken: 165 cal/100g, 31g protein, 3.6g fat, 0g carbs
   * Rice: 130 cal/100g, 2.7g protein, 0.3g fat, 28g carbs
   */
  function createTestRecipe() {
    return createMockRecipe({
      servings: 4,
      servingMultiplierForNelson: 1.5,
      ingredients: [
        {
          id: 'ri-chicken',
          recipeId: 'recipe-1',
          ingredientId: 'ing-chicken',
          unitId: 'unit-grams',
          amount: 400,
          nutritionTarget: 'BOTH',
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
        {
          id: 'ri-rice',
          recipeId: 'recipe-1',
          ingredientId: 'ing-rice',
          unitId: 'unit-grams',
          amount: 300,
          nutritionTarget: 'BOTH',
          additionalInfo: null,
          ingredient: createMockIngredient({
            id: 'ing-rice',
            name: 'Rice',
            calories: 130,
            proteins: 2.7,
            fats: 0.3,
            carbs: 28,
            unitConversions: [
              createMockIngredientUnit('ing-rice', 'unit-grams', 1),
            ],
          }),
          unit: createMockUnit({ id: 'unit-grams', name: 'grams' }),
        },
      ],
    });
  }

  it('should scale all ingredients proportionally when one is edited', () => {
    const { servingScalingFactor } = calculateServingScalingFactor(2, 4, 1.5);

    // Displayed amounts for 2 servings:
    // chicken = 400 * 0.5 = 200g, rice = 300 * 0.5 = 150g
    const chickenDisplayed = 400 * servingScalingFactor;
    const riceDisplayed = 300 * servingScalingFactor;
    expect(chickenDisplayed).toBe(200);
    expect(riceDisplayed).toBe(150);

    // User edits chicken to 300g
    const editRatio = 300 / chickenDisplayed; // 300 / 200 = 1.5
    const manualScaleRatio = computeManualScaleRatio(editRatio, 1, 1);
    expect(manualScaleRatio).toBeCloseTo(1.5);

    // New displayed amounts
    const newChicken = 400 * servingScalingFactor * manualScaleRatio;
    const newRice = 300 * servingScalingFactor * manualScaleRatio;
    expect(newChicken).toBeCloseTo(300);
    expect(newRice).toBeCloseTo(225); // 150 * 1.5
  });

  it('should override previous edits when a second ingredient is edited (last edit wins)', () => {
    const { servingScalingFactor } = calculateServingScalingFactor(2, 4, 1.5);

    // Step 1: edit chicken 200 → 300 (ratio 1.5)
    const ratio1 = 300 / 200;
    const manualScale1 = computeManualScaleRatio(ratio1, 1, 1); // 1.5

    // After step 1: chicken=300, rice=225
    const riceAfterStep1 = 300 * servingScalingFactor * manualScale1; // 225

    // Step 2: edit rice 225 → 200
    const ratio2 = 200 / riceAfterStep1; // 200 / 225 ≈ 0.889
    const manualScale2 = computeManualScaleRatio(ratio2, 1, manualScale1);

    // Rice should be 200
    const newRice = 300 * servingScalingFactor * manualScale2;
    expect(newRice).toBeCloseTo(200);

    // Chicken is now overridden by the second edit
    const newChicken = 400 * servingScalingFactor * manualScale2;
    expect(newChicken).toBeCloseTo(266.7, 1);
  });

  it('should absorb calorie scaling when ingredient is edited', () => {
    const recipe = createTestRecipe();
    const baseNutrition = calculateNutritionPerServing(recipe, 'primary');
    const { servingScalingFactor } = calculateServingScalingFactor(2, 4, 1.5);

    // Set calorie target to 200 (base is 210 per meal for Jagoda)
    const calorieScale = 200 / baseNutrition.calories;

    // Displayed chicken = 400 * 0.5 * calorieScale
    const chickenWithCalories = 400 * servingScalingFactor * calorieScale;

    // User edits chicken to 200g
    const editRatio = 200 / chickenWithCalories;
    const manualScale = computeManualScaleRatio(editRatio, calorieScale, 1);

    // After clearing calorie target (calorieScale=1):
    // chicken = 400 * 0.5 * 1 * manualScale = should be 200
    const newChicken = 400 * servingScalingFactor * manualScale;
    expect(newChicken).toBeCloseTo(200);

    // Rice should have scaled by the same ratio relative to its calorie-scaled display
    const riceWithCalories = 300 * servingScalingFactor * calorieScale;
    const newRice = 300 * servingScalingFactor * manualScale;
    expect(newRice / riceWithCalories).toBeCloseTo(editRatio);
  });

  it('should calculate correct Jagoda and Nelson nutrition with manual scaling', () => {
    const recipe = createTestRecipe();
    const jagodaBaseNutrition = calculateNutritionPerServing(recipe, 'primary');
    const nelsonBaseNutrition = calculateNutritionPerServing(recipe, 'secondary');

    const manualScaleRatio = 1.2;
    const effectiveFactor = 1 * manualScaleRatio; // no calorie target

    const jagodaNutrition = scaleNutrition(jagodaBaseNutrition, effectiveFactor);
    const nelsonNutrition = scaleNutrition(nelsonBaseNutrition, effectiveFactor);

    // Canonical totals: 1050 kcal, servings=4 => mealCount=2, split 1:1.5.
    expect(jagodaBaseNutrition.calories).toBe(210);
    expect(nelsonBaseNutrition.calories).toBe(315);

    expect(jagodaNutrition.calories).toBe(252);

    expect(nelsonNutrition.calories).toBe(378);
  });

  it('should calculate correct nutrition when calorie target is active (no manual edit)', () => {
    const recipe = createTestRecipe();
    const jagodaBaseNutrition = calculateNutritionPerServing(recipe, 'primary');
    const nelsonBaseNutrition = calculateNutritionPerServing(recipe, 'secondary');

    const targetCalories = 500;
    const calorieScale = targetCalories / jagodaBaseNutrition.calories;
    const effectiveFactor = calorieScale * 1; // manualScaleRatio = 1

    const jagodaNutrition = scaleNutrition(jagodaBaseNutrition, effectiveFactor);
    const nelsonNutrition = scaleNutrition(nelsonBaseNutrition, effectiveFactor);

    expect(jagodaNutrition.calories).toBe(500);
    // Nelson tracks the same calorie/manual scaling factor from his own base.
    expect(nelsonNutrition.calories).toBe(750);
  });

  it('should reset to base values when manual scale ratio is 1', () => {
    const recipe = createTestRecipe();
    const baseNutrition = calculateNutritionPerServing(recipe, 'primary');

    const jagodaNutrition = scaleNutrition(baseNutrition, 1);
    expect(jagodaNutrition).toEqual(baseNutrition);
  });

  it('should not affect null-amount ingredients', () => {
    const { servingScalingFactor } = calculateServingScalingFactor(2, 4, 1.5);
    const manualScaleRatio = 1.5;
    const totalScale = servingScalingFactor * manualScaleRatio;

    const result = getIngredientDisplay(
      null, 'unit-grams', 'grams', 'unit-grams',
      [{ unitId: 'unit-grams', gramsPerUnit: 1, unit: { id: 'unit-grams', name: 'grams' } }],
      totalScale, 1,
    );
    expect(result.rawAmount).toBeNull();
    expect(result.displayAmount).toBeNull();
  });
});
