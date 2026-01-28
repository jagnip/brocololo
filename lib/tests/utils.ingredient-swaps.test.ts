import { describe, expect, it } from 'vitest';
import {
  buildEffectiveRecipeForSimulation,
  calculateNutritionPerServing,
  type IngredientSwapMap,
} from '../recipes/helpers';
import {
  createMockIngredient,
  createMockIngredientUnit,
  createMockRecipe,
  createMockUnit,
} from './test-helpers';

describe('buildEffectiveRecipeForSimulation', () => {
  it('keeps amount and unit when replacement supports the same unit', () => {
    const cupUnit = createMockUnit({ id: 'unit-cup', name: 'cup' });
    const originalIngredient = createMockIngredient({
      id: 'ing-flour',
      name: 'Flour',
      calories: 364,
      proteins: 10,
      fats: 1,
      carbs: 76,
      unitConversions: [
        createMockIngredientUnit('ing-flour', 'unit-cup', 120, 'cup'),
        createMockIngredientUnit('ing-flour', 'unit-grams', 1, 'g'),
      ],
    });
    const replacement = createMockIngredient({
      id: 'ing-oat-flour',
      name: 'Oat Flour',
      calories: 404,
      proteins: 14,
      fats: 9,
      carbs: 65,
      unitConversions: [
        createMockIngredientUnit('ing-oat-flour', 'unit-cup', 90, 'cup'),
        createMockIngredientUnit('ing-oat-flour', 'unit-grams', 1, 'g'),
      ],
    });

    const recipe = createMockRecipe({
      ingredients: [
        {
          id: 'ri-flour',
          recipeId: 'recipe-1',
          ingredientId: originalIngredient.id,
          unitId: cupUnit.id,
          amount: 1,
          nutritionTarget: "BOTH",
          additionalInfo: null,
          ingredient: originalIngredient,
          unit: cupUnit,
        },
      ],
    });

    const swaps: IngredientSwapMap = {
      'ri-flour': 'ing-oat-flour',
    };

    const effective = buildEffectiveRecipeForSimulation(recipe, swaps, [replacement]);
    const row = effective.ingredients[0]!;

    expect(row.ingredient.id).toBe('ing-oat-flour');
    expect(row.amount).toBe(1);
    expect(row.unit.id).toBe('unit-cup');
  });

  it('falls back to grams when replacement lacks the original unit', () => {
    const cupUnit = createMockUnit({ id: 'unit-cup', name: 'cup' });
    const originalIngredient = createMockIngredient({
      id: 'ing-rice',
      name: 'Rice',
      calories: 130,
      proteins: 2.7,
      fats: 0.3,
      carbs: 28,
      unitConversions: [
        createMockIngredientUnit('ing-rice', 'unit-cup', 200, 'cup'),
        createMockIngredientUnit('ing-rice', 'unit-grams', 1, 'g'),
      ],
    });
    const replacement = createMockIngredient({
      id: 'ing-potato',
      name: 'Potato',
      calories: 77,
      proteins: 2,
      fats: 0.1,
      carbs: 17,
      unitConversions: [
        createMockIngredientUnit('ing-potato', 'unit-piece', 180, 'piece'),
        createMockIngredientUnit('ing-potato', 'unit-grams', 1, 'g'),
      ],
    });

    const recipe = createMockRecipe({
      ingredients: [
        {
          id: 'ri-rice',
          recipeId: 'recipe-1',
          ingredientId: originalIngredient.id,
          unitId: cupUnit.id,
          amount: 1.5,
          nutritionTarget: "BOTH",
          additionalInfo: null,
          ingredient: originalIngredient,
          unit: cupUnit,
        },
      ],
    });

    const effective = buildEffectiveRecipeForSimulation(
      recipe,
      { 'ri-rice': 'ing-potato' },
      [replacement],
    );
    const row = effective.ingredients[0]!;

    // 1.5 cups rice * 200g/cup = 300g; replacement uses grams as fallback.
    expect(row.ingredient.id).toBe('ing-potato');
    expect(row.unit.name).toBe('g');
    expect(row.amount).toBe(300);
  });

  it('keeps original row when swap points to unknown ingredient', () => {
    const recipe = createMockRecipe();

    const effective = buildEffectiveRecipeForSimulation(
      recipe,
      { 'ri-1': 'missing-id' },
      [],
    );

    expect(effective.ingredients[0]?.ingredient.id).toBe(
      recipe.ingredients[0]?.ingredient.id,
    );
  });

  it('supports independent swaps per row and keeps row IDs stable for instruction linking', () => {
    const chicken = createMockIngredient({
      id: 'ing-chicken',
      name: 'Chicken',
      calories: 165,
      proteins: 31,
      fats: 3.6,
      carbs: 0,
      unitConversions: [
        createMockIngredientUnit('ing-chicken', 'unit-grams', 1, 'g'),
      ],
    });
    const rice = createMockIngredient({
      id: 'ing-rice',
      name: 'Rice',
      calories: 130,
      proteins: 2.7,
      fats: 0.3,
      carbs: 28,
      unitConversions: [createMockIngredientUnit('ing-rice', 'unit-cup', 200, 'cup')],
    });
    const turkey = createMockIngredient({
      id: 'ing-turkey',
      name: 'Turkey',
      calories: 189,
      proteins: 29,
      fats: 7,
      carbs: 0,
      unitConversions: [
        createMockIngredientUnit('ing-turkey', 'unit-grams', 1, 'g'),
      ],
    });
    const quinoa = createMockIngredient({
      id: 'ing-quinoa',
      name: 'Quinoa',
      calories: 120,
      proteins: 4.4,
      fats: 1.9,
      carbs: 21.3,
      unitConversions: [
        createMockIngredientUnit('ing-quinoa', 'unit-cup', 185, 'cup'),
        createMockIngredientUnit('ing-quinoa', 'unit-grams', 1, 'g'),
      ],
    });

    const recipe = createMockRecipe({
      ingredients: [
        {
          id: 'ri-chicken',
          recipeId: 'recipe-1',
          ingredientId: chicken.id,
          unitId: 'unit-grams',
          amount: 300,
          nutritionTarget: "BOTH",
          additionalInfo: null,
          ingredient: chicken,
          unit: createMockUnit({ id: 'unit-grams', name: 'g' }),
        },
        {
          id: 'ri-rice',
          recipeId: 'recipe-1',
          ingredientId: rice.id,
          unitId: 'unit-cup',
          amount: 1,
          nutritionTarget: "BOTH",
          additionalInfo: null,
          ingredient: rice,
          unit: createMockUnit({ id: 'unit-cup', name: 'cup' }),
        },
      ],
    });

    const effective = buildEffectiveRecipeForSimulation(
      recipe,
      {
        'ri-chicken': 'ing-turkey',
        'ri-rice': 'ing-quinoa',
      },
      [turkey, quinoa],
    );

    expect(effective.ingredients[0]?.id).toBe('ri-chicken');
    expect(effective.ingredients[0]?.ingredient.name).toBe('Turkey');
    expect(effective.ingredients[1]?.id).toBe('ri-rice');
    expect(effective.ingredients[1]?.ingredient.name).toBe('Quinoa');
  });
});

describe('swap simulation nutrition integration', () => {
  it('recalculates nutrition from swapped ingredients', () => {
    const chicken = createMockIngredient({
      id: 'ing-chicken',
      name: 'Chicken',
      calories: 165,
      proteins: 31,
      fats: 3.6,
      carbs: 0,
      unitConversions: [createMockIngredientUnit('ing-chicken', 'unit-grams', 1, 'g')],
    });
    const tofu = createMockIngredient({
      id: 'ing-tofu',
      name: 'Tofu',
      calories: 76,
      proteins: 8,
      fats: 4.8,
      carbs: 1.9,
      unitConversions: [createMockIngredientUnit('ing-tofu', 'unit-grams', 1, 'g')],
    });

    const recipe = createMockRecipe({
      servings: 2,
      ingredients: [
        {
          id: 'ri-protein',
          recipeId: 'recipe-1',
          ingredientId: chicken.id,
          unitId: 'unit-grams',
          amount: 200,
          nutritionTarget: "BOTH",
          additionalInfo: null,
          ingredient: chicken,
          unit: createMockUnit({ id: 'unit-grams', name: 'g' }),
        },
      ],
    });

    const original = calculateNutritionPerServing(recipe, 'primary');
    const effective = buildEffectiveRecipeForSimulation(
      recipe,
      { 'ri-protein': 'ing-tofu' },
      [tofu],
    );
    const swapped = calculateNutritionPerServing(effective, 'primary');

    // Default multiplier is 1.5, so primary receives 40% of BOTH-target totals.
    expect(original.calories).toBe(132);
    expect(swapped.calories).toBe(60.8);
    expect(swapped.protein).toBe(6.4);
  });
});
