import type { RecipeType } from '@/types/recipe';


// ============================================================================
// BASE MOCK ENTITIES
// ============================================================================

/**
 * Creates a mock Unit (from units table)
 */
export function createMockUnit(overrides?: Partial<{ id: string; name: string }>) {
  return {
    id: 'unit-1',
    name: 'grams',
    ...overrides,
  };
}

/**
 * Creates a mock IngredientUnit (from ingredient_units table)
 * This represents the conversion between an ingredient and a unit.
 * Includes the nested unit relation as required by RecipeType.
 */
export function createMockIngredientUnit(
  ingredientId: string,
  unitId: string,
  gramsPerUnit: number,
  unitName?: string,
) {
  return {
    ingredientId,
    unitId,
    gramsPerUnit,
    unit: { id: unitId, name: unitName ?? unitId },
  };
}

/**
 * Creates a mock Ingredient (from ingredients table)
 * Includes unitConversions array as required by RecipeType
 */
export function createMockIngredient(overrides?: Partial<{
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  supermarketUrl: string | null;
  categoryId: string;
  unitConversions: Array<{
    ingredientId: string;
    unitId: string;
    gramsPerUnit: number;
    unit: { id: string; name: string };
  }>;
}>) {
  const defaultId = 'ingredient-1';
  const defaultUnitId = 'unit-grams';
  
  return {
    id: defaultId,
    name: 'Chicken Breast',
    slug: 'chicken-breast',
    icon: null,
    calories: 165, 
    proteins: 31, 
    fats: 3.6, 
    carbs: 0, 
    supermarketUrl: null,
    categoryId: 'category-1',
    unitConversions: [
      createMockIngredientUnit(defaultId, defaultUnitId, 1), // 1 gram = 1 gram
    ],
    ...overrides,
  };
}

/**
 * Creates a mock RecipeIngredient (from recipe_ingredients table)
 * This links a recipe to an ingredient with an amount and unit
 */
export function createMockRecipeIngredient(overrides?: Partial<{
  id: string;
  recipeId: string;
  groupId: string | null;
  position: number;
  ingredientId: string;
  unitId: string | null;
  amount: number | null;
  nutritionTarget: 'BOTH' | 'PRIMARY_ONLY' | 'SECONDARY_ONLY';
  additionalInfo: string | null;
  group: { id: string; recipeId: string; name: string; position: number } | null;
  ingredient: ReturnType<typeof createMockIngredient>;
  unit: ReturnType<typeof createMockUnit> | null;
}>) {
  const defaultIngredient = createMockIngredient();
  const defaultUnit = createMockUnit({ id: 'unit-grams', name: 'grams' });

  return {
    id: 'ri-1',
    recipeId: 'recipe-1',
    groupId: null,
    position: 0,
    ingredientId: defaultIngredient.id,
    unitId: defaultUnit.id,
    amount: 400, // 400g
    nutritionTarget: 'BOTH',
    additionalInfo: null,
    group: null,
    ingredient: defaultIngredient,
    unit: defaultUnit,
    ...overrides,
  };
}

/**
 * Creates a mock Category (from categories table)
 */
export function createMockCategory(overrides?: Partial<{
  id: string;
  name: string;
  slug: string;
  type: 'FLAVOUR' | 'RECIPE_TYPE' | 'PROTEIN';
}>) {
  return {
    id: 'category-1',
    name: 'Dinner',
    slug: 'dinner',
    type: 'RECIPE_TYPE' as const,
    ...overrides,
  };
}

/**
 * Creates a mock RecipeImage (from recipe_images table)
 */
export function createMockRecipeImage(overrides?: Partial<{
  id: string;
  recipeId: string;
  url: string;
  isCover: boolean;
  createdAt: Date;
}>) {
  return {
    id: 'image-1',
    recipeId: 'recipe-1',
    url: 'https://example.com/image.jpg',
    isCover: true,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// ============================================================================
// COMPLETE RECIPE MOCK
// ============================================================================

/**
 * Creates a complete mock Recipe matching RecipeType
 * This is the main helper you'll use in most tests
 */
export function createMockRecipe(overrides?: Partial<RecipeType>): RecipeType {
  const defaultRecipeId = 'recipe-1';
  const defaultIngredient = createMockIngredient();
  const defaultUnit = createMockUnit({ id: 'unit-grams', name: 'grams' });

  const defaultRecipe: RecipeType = {
    id: defaultRecipeId,
    name: 'Test Recipe',
    slug: 'test-recipe',
    instructions: [
      {
        id: 'step-1',
        recipeId: defaultRecipeId,
        position: 0,
        text: 'Step 1: Do something',
        ingredients: [],
      },
      {
        id: 'step-2',
        recipeId: defaultRecipeId,
        position: 1,
        text: 'Step 2: Do something else',
        ingredients: [],
      },
    ],
    handsOnTime: 15,
    totalTime: 30,
    notes: [],
    servings: 4,
    servingMultiplierForNelson: 1.5,
    lastUsedInPlanner: null,
    excludeFromPlanner: false,
    categories: [createMockCategory()],
    images: [],
    ingredientGroups: [],
    ingredients: [
      {
        id: 'ri-1',
        recipeId: defaultRecipeId,
        groupId: null,
        position: 0,
        ingredientId: defaultIngredient.id,
        unitId: defaultUnit.id,
        amount: 400, // 400g of chicken
        nutritionTarget: 'BOTH',
        additionalInfo: null,
        group: null,
        ingredient: defaultIngredient,
        unit: defaultUnit,
      },
    ],
  };

  // Deep merge to handle nested objects properly
  if (overrides) {
    return {
      ...defaultRecipe,
      ...overrides,
      categories: overrides.categories ?? defaultRecipe.categories,
      images: overrides.images ?? defaultRecipe.images,
      ingredients: overrides.ingredients ?? defaultRecipe.ingredients,
    };
  }

  return defaultRecipe;
}

// ============================================================================
// SPECIALIZED RECIPE VARIANTS
// ============================================================================

/**
 * Creates a recipe with multiple ingredients for complex tests
 */
export function createComplexMockRecipe(): RecipeType {
  const gramUnit = createMockUnit({ id: 'unit-grams', name: 'grams' });
  const cupUnit = createMockUnit({ id: 'unit-cup', name: 'cup' });

  const chickenIngredient = createMockIngredient({
    id: 'ing-chicken',
    name: 'Chicken Breast',
    slug: 'chicken-breast',
    calories: 165,
    proteins: 31,
    fats: 3.6,
    carbs: 0,
    unitConversions: [
      createMockIngredientUnit('ing-chicken', 'unit-grams', 1),
    ],
  });

  const riceIngredient = createMockIngredient({
    id: 'ing-rice',
    name: 'White Rice',
    slug: 'white-rice',
    calories: 130,
    proteins: 2.7,
    fats: 0.3,
    carbs: 28,
    unitConversions: [
      createMockIngredientUnit('ing-rice', 'unit-cup', 200), // 1 cup = 200g
    ],
  });

  return createMockRecipe({
    servings: 2,
    ingredients: [
      {
        id: 'ri-chicken',
        recipeId: 'recipe-1',
        groupId: null,
        position: 0,
        ingredientId: 'ing-chicken',
        unitId: 'unit-grams',
        amount: 200, // 200g chicken
        nutritionTarget: 'BOTH',
        additionalInfo: null,
        group: null,
        ingredient: chickenIngredient,
        unit: gramUnit,
      },
      {
        id: 'ri-rice',
        recipeId: 'recipe-1',
        groupId: null,
        position: 1,
        ingredientId: 'ing-rice',
        unitId: 'unit-cup',
        amount: 1, // 1 cup rice
        nutritionTarget: 'BOTH',
        additionalInfo: null,
        group: null,
        ingredient: riceIngredient,
        unit: cupUnit,
      },
    ],
  });
}

/**
 * Creates a recipe with secondary-only ingredients for nutrition targeting tests
 */
export function createRecipeWithExcludedIngredients(): RecipeType {
  const saltIngredient = createMockIngredient({
    id: 'ing-salt',
    name: 'Salt',
    slug: 'salt',
    calories: 0,
    proteins: 0,
    fats: 0,
    carbs: 0,
    unitConversions: [
      createMockIngredientUnit('ing-salt', 'unit-grams', 1),
    ],
  });

  return createMockRecipe({
    servings: 2,
    ingredients: [
      createMockRecipeIngredient({
        id: 'ri-chicken',
        amount: 200,
        nutritionTarget: 'BOTH',
        ingredient: createMockIngredient(),
      }),
      createMockRecipeIngredient({
        id: 'ri-salt',
        amount: 5,
        nutritionTarget: 'SECONDARY_ONLY', // Secondary-only in new model
        ingredient: saltIngredient,
      }),
    ],
  });
}

/**
 * Creates a recipe with ingredients that have null amounts (e.g., "to taste")
 */
export function createRecipeWithNullAmounts(): RecipeType {
  return createMockRecipe({
    servings: 2,
    ingredients: [
      createMockRecipeIngredient({
        id: 'ri-chicken',
        amount: 200,
        nutritionTarget: 'BOTH',
      }),
      createMockRecipeIngredient({
        id: 'ri-salt',
        amount: null, // "To taste" - should be ignored
        nutritionTarget: 'BOTH',
        ingredient: createMockIngredient({
          id: 'ing-salt',
          name: 'Salt',
          slug: 'salt',
        }),
      }),
    ],
  });
}

/**
 * Creates a recipe with ingredients missing unit conversions
 */
export function createRecipeWithMissingConversions(): RecipeType {
  const ingredientWithoutConversion = createMockIngredient({
    id: 'ing-no-conversion',
    name: 'Mystery Ingredient',
    slug: 'mystery-ingredient',
    unitConversions: [], // No conversions defined
  });

  return createMockRecipe({
    servings: 2,
    ingredients: [
      createMockRecipeIngredient({
        id: 'ri-no-conversion',
        amount: 100,
        ingredient: ingredientWithoutConversion,
      }),
    ],
  });
}

/**
 * Creates a minimal recipe (just the required fields)
 * Useful for testing edge cases
 */
export function createMinimalRecipe(): RecipeType {
  return {
    id: 'recipe-minimal',
    name: 'Minimal Recipe',
    slug: 'minimal-recipe',
    instructions: [],
    handsOnTime: 0,
    totalTime: 0,
    notes: [],
    servings: 1,
    servingMultiplierForNelson: 1,
    lastUsedInPlanner: null,
    excludeFromPlanner: false,
    categories: [],
    images: [],
    ingredientGroups: [],
    ingredients: [],
  };
}