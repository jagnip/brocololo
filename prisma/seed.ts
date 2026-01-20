import 'dotenv/config';
import { prisma } from '../lib/db/index';
import slugify from 'slugify';

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (order matters due to foreign keys)
  await prisma.recipeIngredient.deleteMany();
  await prisma.ingredientUnit.deleteMany();
  await prisma.recipeImage.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.category.deleteMany();

  // Create FLAVOUR categories
  const sweet = await prisma.category.create({
    data: {
      name: 'Sweet',
      slug: 'sweet',
      type: 'FLAVOUR',
    },
  });

  const savoury = await prisma.category.create({
    data: {
      name: 'Savoury',
      slug: 'savoury',
      type: 'FLAVOUR',
    },
  });

  // Create RECIPE_TYPE categories with parents:
  const cake = await prisma.category.create({
    data: {
      name: 'Cake',
      slug: 'cake',
      type: 'RECIPE_TYPE',
      parentId: sweet.id,
    },
  });

  const cookies = await prisma.category.create({
    data: {
      name: 'Cookies',
      slug: 'cookies',
      type: 'RECIPE_TYPE',
      parentId: sweet.id,
    },
  });

  const pancakes = await prisma.category.create({
    data: {
      name: 'Pancakes',
      slug: 'pancakes',
      type: 'RECIPE_TYPE',
      parentId: sweet.id,
    },
  });

  const oats = await prisma.category.create({
    data: {
      name: 'Oats',
      slug: 'oats',
      type: 'RECIPE_TYPE',
      parentId: sweet.id,
    },
  });

  const wrap = await prisma.category.create({
    data: {
      name: 'Wrap',
      slug: 'wrap',
      type: 'RECIPE_TYPE',
      parentId: savoury.id,
    },
  });

  const sandwich = await prisma.category.create({
    data: {
      name: 'Sandwich',
      slug: 'sandwich',
      type: 'RECIPE_TYPE',
      parentId: savoury.id,
    },
  });

  const pasta = await prisma.category.create({
    data: {
      name: 'Pasta',
      slug: 'pasta',
      type: 'RECIPE_TYPE',
      parentId: savoury.id,
    },
  });

  // PROTEIN categories
  const chicken = await prisma.category.create({
    data: {
      name: 'Chicken',
      slug: 'chicken',
      type: 'PROTEIN',
    },
  });

  const beef = await prisma.category.create({
    data: {
      name: 'Beef',
      slug: 'beef',
      type: 'PROTEIN',
    },
  });

  const fish = await prisma.category.create({
    data: {
      name: 'Fish',
      slug: 'fish',
      type: 'PROTEIN',
    },
  });

  const pork = await prisma.category.create({
    data: {
      name: 'Pork',
      slug: 'pork',
      type: 'PROTEIN',
    },
  });

  const tofu = await prisma.category.create({
    data: {
      name: 'Tofu',
      slug: 'tofu',
      type: 'PROTEIN',
    },
  });

  const turkey = await prisma.category.create({
    data: {
      name: 'Turkey',
      slug: 'turkey',
      type: 'PROTEIN',
    },
  });

  console.log('✅ Created categories');

  // Create units
  const unitG = await prisma.unit.create({ data: { name: 'g' } });
  const unitMl = await prisma.unit.create({ data: { name: 'ml' } });
  const unitTbsp = await prisma.unit.create({ data: { name: 'tbsp' } });
  const unitTsp = await prisma.unit.create({ data: { name: 'tsp' } });
  const unitCup = await prisma.unit.create({ data: { name: 'cup' } });

  console.log('✅ Created units');

  const supermarketUrl = 'https://www.continente.pt/produto/lombos-de-bacalhau-12-meses-de-cura-msc-gourmet-ultracongelado-riberalves-riberalves-6364533.html';

  // Create ingredients
  const tomato = await prisma.ingredient.create({
    data: { name: 'Tomato', slug: 'tomato', supermarketUrl, calories: 18, proteins: 0.9, fats: 0.2, carbs: 3.9 },
  });
  const onion = await prisma.ingredient.create({
    data: { name: 'Onion', slug: 'onion', supermarketUrl, calories: 40, proteins: 1.1, fats: 0.1, carbs: 9.3 },
  });
  const garlic = await prisma.ingredient.create({
    data: { name: 'Garlic', slug: 'garlic', supermarketUrl, calories: 149, proteins: 6.4, fats: 0.5, carbs: 33.1 },
  });
  const oliveOil = await prisma.ingredient.create({
    data: { name: 'Olive Oil', slug: 'olive-oil', supermarketUrl, calories: 884, proteins: 0.0, fats: 100.0, carbs: 0.0 },
  });
  const pastaIngredient = await prisma.ingredient.create({
    data: { name: 'Pasta', slug: 'pasta', supermarketUrl, calories: 131, proteins: 5.0, fats: 1.1, carbs: 25.0 },
  });
  const flour = await prisma.ingredient.create({
    data: { name: 'All-Purpose Flour', slug: 'all-purpose-flour', supermarketUrl, calories: 364, proteins: 10.3, fats: 1.0, carbs: 76.3 },
  });
  const sugar = await prisma.ingredient.create({
    data: { name: 'Granulated Sugar', slug: 'granulated-sugar', supermarketUrl, calories: 387, proteins: 0.0, fats: 0.0, carbs: 100.0 },
  });
  const butter = await prisma.ingredient.create({
    data: { name: 'Butter', slug: 'butter', supermarketUrl, calories: 717, proteins: 0.9, fats: 81.1, carbs: 0.1 },
  });
  const eggs = await prisma.ingredient.create({
    data: { name: 'Eggs', slug: 'eggs', supermarketUrl, calories: 155, proteins: 13.0, fats: 11.0, carbs: 1.1 },
  });
  const milk = await prisma.ingredient.create({
    data: { name: 'Whole Milk', slug: 'whole-milk', supermarketUrl, calories: 61, proteins: 3.2, fats: 3.3, carbs: 4.8 },
  });
  const chickenIngredient = await prisma.ingredient.create({
    data: { name: 'Chicken Breast', slug: 'chicken-breast', supermarketUrl, calories: 165, proteins: 31.0, fats: 3.6, carbs: 0.0 },
  });
  const rolledOats = await prisma.ingredient.create({
    data: { name: 'Rolled Oats', slug: 'rolled-oats', supermarketUrl, calories: 389, proteins: 16.9, fats: 6.9, carbs: 66.3 },
  });
  const beefIngredient = await prisma.ingredient.create({
    data: { name: 'Ground Beef', slug: 'ground-beef', supermarketUrl, calories: 250, proteins: 26.0, fats: 17.0, carbs: 0.0 },
  });
  const salmon = await prisma.ingredient.create({
    data: { name: 'Salmon', slug: 'salmon', supermarketUrl, calories: 208, proteins: 20.0, fats: 12.0, carbs: 0.0 },
  });
  const porkIngredient = await prisma.ingredient.create({
    data: { name: 'Pork Tenderloin', slug: 'pork-tenderloin', supermarketUrl, calories: 143, proteins: 22.0, fats: 5.0, carbs: 0.0 },
  });
  const tofuIngredient = await prisma.ingredient.create({
    data: { name: 'Firm Tofu', slug: 'firm-tofu', supermarketUrl, calories: 76, proteins: 8.0, fats: 4.6, carbs: 1.9 },
  });
  const turkeyIngredient = await prisma.ingredient.create({
    data: { name: 'Turkey Breast', slug: 'turkey-breast', supermarketUrl, calories: 135, proteins: 30.0, fats: 1.0, carbs: 0.0 },
  });
  const cheese = await prisma.ingredient.create({
    data: { name: 'Mozzarella Cheese', slug: 'mozzarella-cheese', supermarketUrl, calories: 300, proteins: 22.0, fats: 22.0, carbs: 2.2 },
  });
  const bread = await prisma.ingredient.create({
    data: { name: 'Bread', slug: 'bread', supermarketUrl, calories: 265, proteins: 9.0, fats: 3.2, carbs: 49.0 },
  });
  const tortilla = await prisma.ingredient.create({
    data: { name: 'Tortilla Wrap', slug: 'tortilla-wrap', supermarketUrl, calories: 300, proteins: 8.0, fats: 8.0, carbs: 50.0 },
  });

  console.log('✅ Created ingredients');

  // Create unit conversions (simplified - just g for most)
  const ingredients = [tomato, onion, garlic, pastaIngredient, flour, sugar, butter, eggs, chickenIngredient, rolledOats, beefIngredient, salmon, porkIngredient, tofuIngredient, turkeyIngredient, cheese, bread, tortilla];
  for (const ing of ingredients) {
    await prisma.ingredientUnit.create({
      data: { ingredientId: ing.id, unitId: unitG.id, gramsPerUnit: 1 },
    });
  }

  // Special conversions
  await prisma.ingredientUnit.create({ data: { ingredientId: oliveOil.id, unitId: unitMl.id, gramsPerUnit: 0.92 } });
  await prisma.ingredientUnit.create({ data: { ingredientId: oliveOil.id, unitId: unitTbsp.id, gramsPerUnit: 13.8 } });
  await prisma.ingredientUnit.create({ data: { ingredientId: flour.id, unitId: unitCup.id, gramsPerUnit: 120 } });
  await prisma.ingredientUnit.create({ data: { ingredientId: sugar.id, unitId: unitCup.id, gramsPerUnit: 200 } });
  await prisma.ingredientUnit.create({ data: { ingredientId: sugar.id, unitId: unitTbsp.id, gramsPerUnit: 12.5 } });
  await prisma.ingredientUnit.create({ data: { ingredientId: butter.id, unitId: unitTbsp.id, gramsPerUnit: 14.2 } });
  await prisma.ingredientUnit.create({ data: { ingredientId: milk.id, unitId: unitMl.id, gramsPerUnit: 1.03 } });
  await prisma.ingredientUnit.create({ data: { ingredientId: milk.id, unitId: unitCup.id, gramsPerUnit: 240 } });
  await prisma.ingredientUnit.create({ data: { ingredientId: rolledOats.id, unitId: unitCup.id, gramsPerUnit: 100 } });

  console.log('✅ Created unit conversions');

  // Helper function to create recipe
  const createRecipe = async (data: {
    name: string;
    handsOnTime: number;
    totalTime: number;
    servings: number;
    instructions: string[];
    notes: string[];
    categoryIds: string[];
    ingredients: Array<{ ingredientId: string; unitId: string; amount: number }>;
    imageUrl?: string;
  }) => {
    return await prisma.recipe.create({
      data: {
        name: data.name,
        slug: slugify(data.name, { lower: true, strict: true, trim: true }),
        handsOnTime: data.handsOnTime,
        totalTime: data.totalTime,
        servings: data.servings,
        instructions: data.instructions,
        notes: data.notes,
        categories: { connect: data.categoryIds.map(id => ({ id })) },
        ingredients: { create: data.ingredients },
        images: data.imageUrl ? {
          create: [{ url: data.imageUrl, isCover: true }]
        } : undefined,
      },
    });
  };

  // SWEET RECIPES (20 recipes)
  await createRecipe({
    name: 'Chocolate Chip Cookies',
    handsOnTime: 15,
    totalTime: 30,
    servings: 24,
    instructions: ['Preheat oven to 375°F', 'Cream butter and sugar', 'Add eggs and flour', 'Fold in chocolate chips', 'Bake for 10 minutes'],
    notes: ['Don\'t overmix for chewier cookies'],
    categoryIds: [sweet.id, cookies.id],
    ingredients: [
      { ingredientId: flour.id, unitId: unitCup.id, amount: 2.25 },
      { ingredientId: sugar.id, unitId: unitCup.id, amount: 0.75 },
      { ingredientId: butter.id, unitId: unitTbsp.id, amount: 12 },
      { ingredientId: eggs.id, unitId: unitG.id, amount: 100 },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800',
  });

  await createRecipe({
    name: 'Classic Pancakes',
    handsOnTime: 10,
    totalTime: 20,
    servings: 8,
    instructions: ['Mix dry ingredients', 'Mix wet ingredients', 'Combine gently', 'Cook on griddle', 'Flip when bubbles form'],
    notes: ['Don\'t overmix - lumps are okay'],
    categoryIds: [sweet.id, pancakes.id],
    ingredients: [
      { ingredientId: flour.id, unitId: unitCup.id, amount: 1.5 },
      { ingredientId: sugar.id, unitId: unitTbsp.id, amount: 2 },
      { ingredientId: eggs.id, unitId: unitG.id, amount: 100 },
      { ingredientId: milk.id, unitId: unitCup.id, amount: 1.25 },
      { ingredientId: butter.id, unitId: unitTbsp.id, amount: 3 },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
  });

  await createRecipe({
    name: 'Overnight Oats',
    handsOnTime: 5,
    totalTime: 485, // 8 hours + 5 min
    servings: 2,
    instructions: ['Combine oats and milk', 'Add sweetener', 'Refrigerate overnight', 'Stir and serve'],
    notes: ['Can be stored for up to 5 days'],
    categoryIds: [sweet.id, oats.id],
    ingredients: [
      { ingredientId: rolledOats.id, unitId: unitG.id, amount: 100 },
      { ingredientId: milk.id, unitId: unitMl.id, amount: 200 },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1575925510742-0d93b13c0c4a?w=800',
  });

  await createRecipe({
    name: 'Vanilla Cake',
    handsOnTime: 20,
    totalTime: 80,
    servings: 12,
    instructions: ['Preheat oven to 350°F', 'Cream butter and sugar', 'Add eggs and vanilla', 'Alternate flour and milk', 'Bake for 30 minutes'],
    notes: ['Let cool completely before frosting'],
    categoryIds: [sweet.id, cake.id],
    ingredients: [
      { ingredientId: flour.id, unitId: unitCup.id, amount: 2 },
      { ingredientId: sugar.id, unitId: unitCup.id, amount: 1.5 },
      { ingredientId: butter.id, unitId: unitTbsp.id, amount: 8 },
      { ingredientId: eggs.id, unitId: unitG.id, amount: 150 },
      { ingredientId: milk.id, unitId: unitCup.id, amount: 1 },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800',
  });

  await createRecipe({
    name: 'Oatmeal Cookies',
    handsOnTime: 15,
    totalTime: 35,
    servings: 24,
    instructions: ['Mix dry ingredients', 'Cream butter and sugar', 'Combine and add oats', 'Bake for 12 minutes'],
    notes: ['Store in airtight container'],
    categoryIds: [sweet.id, cookies.id],
    ingredients: [
      { ingredientId: flour.id, unitId: unitCup.id, amount: 1 },
      { ingredientId: rolledOats.id, unitId: unitCup.id, amount: 2 },
      { ingredientId: sugar.id, unitId: unitCup.id, amount: 0.75 },
      { ingredientId: butter.id, unitId: unitTbsp.id, amount: 8 },
      { ingredientId: eggs.id, unitId: unitG.id, amount: 100 },
    ],
  });

  await createRecipe({
    name: 'Blueberry Pancakes',
    handsOnTime: 10,
    totalTime: 25,
    servings: 8,
    instructions: ['Make pancake batter', 'Add blueberries', 'Cook on griddle', 'Serve with syrup'],
    notes: ['Use fresh or frozen blueberries'],
    categoryIds: [sweet.id, pancakes.id],
    ingredients: [
      { ingredientId: flour.id, unitId: unitCup.id, amount: 1.5 },
      { ingredientId: sugar.id, unitId: unitTbsp.id, amount: 2 },
      { ingredientId: eggs.id, unitId: unitG.id, amount: 100 },
      { ingredientId: milk.id, unitId: unitCup.id, amount: 1.25 },
    ],
  });

  await createRecipe({
    name: 'Apple Oatmeal',
    handsOnTime: 5,
    totalTime: 15,
    servings: 2,
    instructions: ['Cook oats with milk', 'Add diced apple', 'Simmer until tender', 'Serve warm'],
    notes: ['Add cinnamon for extra flavor'],
    categoryIds: [sweet.id, oats.id],
    ingredients: [
      { ingredientId: rolledOats.id, unitId: unitG.id, amount: 100 },
      { ingredientId: milk.id, unitId: unitMl.id, amount: 300 },
    ],
  });

  await createRecipe({
    name: 'Chocolate Cake',
    handsOnTime: 25,
    totalTime: 95,
    servings: 12,
    instructions: ['Preheat oven to 350°F', 'Mix dry ingredients', 'Combine wet ingredients', 'Bake for 35 minutes'],
    notes: ['Best served with chocolate frosting'],
    categoryIds: [sweet.id, cake.id],
    ingredients: [
      { ingredientId: flour.id, unitId: unitCup.id, amount: 2 },
      { ingredientId: sugar.id, unitId: unitCup.id, amount: 1.75 },
      { ingredientId: butter.id, unitId: unitTbsp.id, amount: 10 },
      { ingredientId: eggs.id, unitId: unitG.id, amount: 150 },
      { ingredientId: milk.id, unitId: unitCup.id, amount: 1 },
    ],
  });

  await createRecipe({
    name: 'Sugar Cookies',
    handsOnTime: 20,
    totalTime: 50,
    servings: 36,
    instructions: ['Cream butter and sugar', 'Add eggs and flour', 'Chill dough', 'Cut shapes and bake'],
    notes: ['Decorate with icing after cooling'],
    categoryIds: [sweet.id, cookies.id],
    ingredients: [
      { ingredientId: flour.id, unitId: unitCup.id, amount: 3 },
      { ingredientId: sugar.id, unitId: unitCup.id, amount: 1 },
      { ingredientId: butter.id, unitId: unitTbsp.id, amount: 16 },
      { ingredientId: eggs.id, unitId: unitG.id, amount: 100 },
    ],
  });

  await createRecipe({
    name: 'Banana Pancakes',
    handsOnTime: 10,
    totalTime: 20,
    servings: 8,
    instructions: ['Mash banana', 'Mix with pancake batter', 'Cook on griddle', 'Serve with honey'],
    notes: ['Use ripe bananas for best flavor'],
    categoryIds: [sweet.id, pancakes.id],
    ingredients: [
      { ingredientId: flour.id, unitId: unitCup.id, amount: 1.5 },
      { ingredientId: sugar.id, unitId: unitTbsp.id, amount: 1 },
      { ingredientId: eggs.id, unitId: unitG.id, amount: 100 },
      { ingredientId: milk.id, unitId: unitCup.id, amount: 1 },
    ],
  });

  // Add 10 more sweet recipes (cakes, cookies, pancakes, oats variations)
  const sweetRecipes = [
    { name: 'Strawberry Shortcake', type: cake.id, time: 30, total: 60 },
    { name: 'Peanut Butter Cookies', type: cookies.id, time: 15, total: 30 },
    { name: 'Cinnamon Pancakes', type: pancakes.id, time: 10, total: 20 },
    { name: 'Maple Oatmeal', type: oats.id, time: 5, total: 15 },
    { name: 'Lemon Cake', type: cake.id, time: 25, total: 85 },
    { name: 'Ginger Cookies', type: cookies.id, time: 15, total: 35 },
    { name: 'Whole Wheat Pancakes', type: pancakes.id, time: 10, total: 20 },
    { name: 'Chocolate Oatmeal', type: oats.id, time: 5, total: 15 },
    { name: 'Carrot Cake', type: cake.id, time: 30, total: 90 },
    { name: 'Snickerdoodles', type: cookies.id, time: 15, total: 30 },
  ];

  for (const recipe of sweetRecipes) {
    await createRecipe({
      name: recipe.name,
      handsOnTime: recipe.time,
      totalTime: recipe.total,
      servings: 8,
      instructions: ['Prepare ingredients', 'Mix according to recipe', 'Cook or bake as directed', 'Serve and enjoy'],
      notes: ['Follow recipe instructions carefully'],
      categoryIds: [sweet.id, recipe.type],
      ingredients: [
        { ingredientId: flour.id, unitId: unitCup.id, amount: 2 },
        { ingredientId: sugar.id, unitId: unitCup.id, amount: 0.5 },
        { ingredientId: butter.id, unitId: unitTbsp.id, amount: 8 },
        { ingredientId: eggs.id, unitId: unitG.id, amount: 100 },
      ],
    });
  }

  // SAVOURY RECIPES (20 recipes) - ALL MUST HAVE PROTEIN
  await createRecipe({
    name: 'Chicken Pasta',
    handsOnTime: 20,
    totalTime: 40,
    servings: 4,
    instructions: ['Cook pasta', 'Season and cook chicken', 'Prepare sauce', 'Combine and serve'],
    notes: ['Cook chicken to 165°F internal temperature'],
    categoryIds: [savoury.id, pasta.id, chicken.id],
    ingredients: [
      { ingredientId: pastaIngredient.id, unitId: unitG.id, amount: 400 },
      { ingredientId: chickenIngredient.id, unitId: unitG.id, amount: 300 },
      { ingredientId: tomato.id, unitId: unitG.id, amount: 400 },
      { ingredientId: oliveOil.id, unitId: unitTbsp.id, amount: 2 },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800',
  });

  await createRecipe({
    name: 'Chicken Wrap',
    handsOnTime: 15,
    totalTime: 25,
    servings: 2,
    instructions: ['Cook chicken', 'Slice into strips', 'Warm tortillas', 'Assemble wraps'],
    notes: ['Add your favorite vegetables'],
    categoryIds: [savoury.id, wrap.id, chicken.id],
    ingredients: [
      { ingredientId: chickenIngredient.id, unitId: unitG.id, amount: 200 },
      { ingredientId: tortilla.id, unitId: unitG.id, amount: 100 },
      { ingredientId: tomato.id, unitId: unitG.id, amount: 100 },
    ],
    imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800',
  });

  await createRecipe({
    name: 'Chicken Sandwich',
    handsOnTime: 10,
    totalTime: 20,
    servings: 2,
    instructions: ['Cook chicken', 'Toast bread', 'Add cheese and vegetables', 'Assemble sandwich'],
    notes: ['Serve with your favorite condiments'],
    categoryIds: [savoury.id, sandwich.id, chicken.id],
    ingredients: [
      { ingredientId: chickenIngredient.id, unitId: unitG.id, amount: 200 },
      { ingredientId: bread.id, unitId: unitG.id, amount: 100 },
      { ingredientId: cheese.id, unitId: unitG.id, amount: 50 },
    ],
  });

  await createRecipe({
    name: 'Beef Pasta',
    handsOnTime: 25,
    totalTime: 45,
    servings: 4,
    instructions: ['Brown ground beef', 'Add sauce ingredients', 'Simmer sauce', 'Cook pasta and combine'],
    notes: ['Let sauce simmer for best flavor'],
    categoryIds: [savoury.id, pasta.id, beef.id],
    ingredients: [
      { ingredientId: pastaIngredient.id, unitId: unitG.id, amount: 400 },
      { ingredientId: beefIngredient.id, unitId: unitG.id, amount: 400 },
      { ingredientId: tomato.id, unitId: unitG.id, amount: 500 },
      { ingredientId: onion.id, unitId: unitG.id, amount: 150 },
    ],
  });

  await createRecipe({
    name: 'Beef Wrap',
    handsOnTime: 20,
    totalTime: 30,
    servings: 2,
    instructions: ['Cook ground beef', 'Season well', 'Warm tortillas', 'Assemble wraps'],
    notes: ['Add cheese and vegetables'],
    categoryIds: [savoury.id, wrap.id, beef.id],
    ingredients: [
      { ingredientId: beefIngredient.id, unitId: unitG.id, amount: 250 },
      { ingredientId: tortilla.id, unitId: unitG.id, amount: 100 },
      { ingredientId: cheese.id, unitId: unitG.id, amount: 50 },
    ],
  });

  await createRecipe({
    name: 'Beef Sandwich',
    handsOnTime: 15,
    totalTime: 25,
    servings: 2,
    instructions: ['Cook ground beef', 'Toast bread', 'Layer ingredients', 'Serve hot'],
    notes: ['Great with pickles and onions'],
    categoryIds: [savoury.id, sandwich.id, beef.id],
    ingredients: [
      { ingredientId: beefIngredient.id, unitId: unitG.id, amount: 250 },
      { ingredientId: bread.id, unitId: unitG.id, amount: 100 },
      { ingredientId: cheese.id, unitId: unitG.id, amount: 50 },
    ],
  });

  await createRecipe({
    name: 'Salmon Pasta',
    handsOnTime: 20,
    totalTime: 35,
    servings: 4,
    instructions: ['Cook salmon', 'Flake into pieces', 'Cook pasta', 'Combine with sauce'],
    notes: ['Don\'t overcook the salmon'],
    categoryIds: [savoury.id, pasta.id, fish.id],
    ingredients: [
      { ingredientId: pastaIngredient.id, unitId: unitG.id, amount: 400 },
      { ingredientId: salmon.id, unitId: unitG.id, amount: 300 },
      { ingredientId: oliveOil.id, unitId: unitTbsp.id, amount: 2 },
      { ingredientId: garlic.id, unitId: unitG.id, amount: 10 },
    ],
  });

  await createRecipe({
    name: 'Salmon Wrap',
    handsOnTime: 15,
    totalTime: 25,
    servings: 2,
    instructions: ['Cook salmon', 'Flake into pieces', 'Warm tortillas', 'Assemble wraps'],
    notes: ['Add fresh vegetables'],
    categoryIds: [savoury.id, wrap.id, fish.id],
    ingredients: [
      { ingredientId: salmon.id, unitId: unitG.id, amount: 200 },
      { ingredientId: tortilla.id, unitId: unitG.id, amount: 100 },
      { ingredientId: tomato.id, unitId: unitG.id, amount: 100 },
    ],
  });

  await createRecipe({
    name: 'Pork Pasta',
    handsOnTime: 25,
    totalTime: 45,
    servings: 4,
    instructions: ['Cook pork tenderloin', 'Slice into strips', 'Cook pasta', 'Combine with sauce'],
    notes: ['Rest pork before slicing'],
    categoryIds: [savoury.id, pasta.id, pork.id],
    ingredients: [
      { ingredientId: pastaIngredient.id, unitId: unitG.id, amount: 400 },
      { ingredientId: porkIngredient.id, unitId: unitG.id, amount: 300 },
      { ingredientId: tomato.id, unitId: unitG.id, amount: 400 },
      { ingredientId: oliveOil.id, unitId: unitTbsp.id, amount: 2 },
    ],
  });

  await createRecipe({
    name: 'Pork Sandwich',
    handsOnTime: 20,
    totalTime: 35,
    servings: 2,
    instructions: ['Cook pork', 'Slice thinly', 'Toast bread', 'Assemble sandwich'],
    notes: ['Serve with barbecue sauce'],
    categoryIds: [savoury.id, sandwich.id, pork.id],
    ingredients: [
      { ingredientId: porkIngredient.id, unitId: unitG.id, amount: 200 },
      { ingredientId: bread.id, unitId: unitG.id, amount: 100 },
      { ingredientId: cheese.id, unitId: unitG.id, amount: 50 },
    ],
  });

  await createRecipe({
    name: 'Tofu Pasta',
    handsOnTime: 20,
    totalTime: 40,
    servings: 4,
    instructions: ['Press and cube tofu', 'Pan-fry until golden', 'Cook pasta', 'Combine with sauce'],
    notes: ['Press tofu to remove excess water'],
    categoryIds: [savoury.id, pasta.id, tofu.id],
    ingredients: [
      { ingredientId: pastaIngredient.id, unitId: unitG.id, amount: 400 },
      { ingredientId: tofuIngredient.id, unitId: unitG.id, amount: 300 },
      { ingredientId: tomato.id, unitId: unitG.id, amount: 400 },
      { ingredientId: oliveOil.id, unitId: unitTbsp.id, amount: 2 },
    ],
  });

  await createRecipe({
    name: 'Tofu Wrap',
    handsOnTime: 15,
    totalTime: 25,
    servings: 2,
    instructions: ['Press and cook tofu', 'Warm tortillas', 'Add vegetables', 'Assemble wraps'],
    notes: ['Marinate tofu for extra flavor'],
    categoryIds: [savoury.id, wrap.id, tofu.id],
    ingredients: [
      { ingredientId: tofuIngredient.id, unitId: unitG.id, amount: 200 },
      { ingredientId: tortilla.id, unitId: unitG.id, amount: 100 },
      { ingredientId: tomato.id, unitId: unitG.id, amount: 100 },
    ],
  });

  await createRecipe({
    name: 'Turkey Sandwich',
    handsOnTime: 10,
    totalTime: 20,
    servings: 2,
    instructions: ['Slice turkey', 'Toast bread', 'Layer ingredients', 'Serve'],
    notes: ['Great for lunch'],
    categoryIds: [savoury.id, sandwich.id, turkey.id],
    ingredients: [
      { ingredientId: turkeyIngredient.id, unitId: unitG.id, amount: 150 },
      { ingredientId: bread.id, unitId: unitG.id, amount: 100 },
      { ingredientId: cheese.id, unitId: unitG.id, amount: 50 },
    ],
  });

  await createRecipe({
    name: 'Turkey Wrap',
    handsOnTime: 10,
    totalTime: 15,
    servings: 2,
    instructions: ['Slice turkey', 'Warm tortillas', 'Assemble wraps', 'Serve'],
    notes: ['Add cranberry sauce for holiday flavor'],
    categoryIds: [savoury.id, wrap.id, turkey.id],
    ingredients: [
      { ingredientId: turkeyIngredient.id, unitId: unitG.id, amount: 150 },
      { ingredientId: tortilla.id, unitId: unitG.id, amount: 100 },
      { ingredientId: cheese.id, unitId: unitG.id, amount: 50 },
    ],
  });

  // Add 7 more savoury recipes with different protein combinations
  const savouryRecipes = [
    { name: 'Chicken Alfredo Pasta', type: pasta.id, protein: chicken.id, time: 25, total: 45 },
    { name: 'Beef Bolognese Pasta', type: pasta.id, protein: beef.id, time: 30, total: 60 },
    { name: 'Salmon Sandwich', type: sandwich.id, protein: fish.id, time: 15, total: 25 },
    { name: 'Pork Wrap', type: wrap.id, protein: pork.id, time: 20, total: 30 },
    { name: 'Tofu Sandwich', type: sandwich.id, protein: tofu.id, time: 15, total: 25 },
    { name: 'Turkey Pasta', type: pasta.id, protein: turkey.id, time: 20, total: 40 },
    { name: 'Chicken Caesar Wrap', type: wrap.id, protein: chicken.id, time: 15, total: 20 },
  ];

  for (const recipe of savouryRecipes) {
    await createRecipe({
      name: recipe.name,
      handsOnTime: recipe.time,
      totalTime: recipe.total,
      servings: 4,
      instructions: ['Prepare protein', 'Cook as needed', 'Assemble dish', 'Serve hot'],
      notes: ['Season to taste'],
      categoryIds: [savoury.id, recipe.type, recipe.protein],
      ingredients: [
        { ingredientId: recipe.protein === chicken.id ? chickenIngredient.id : recipe.protein === beef.id ? beefIngredient.id : recipe.protein === fish.id ? salmon.id : recipe.protein === pork.id ? porkIngredient.id : recipe.protein === tofu.id ? tofuIngredient.id : turkeyIngredient.id, unitId: unitG.id, amount: 200 },
        { ingredientId: recipe.type === pasta.id ? pastaIngredient.id : recipe.type === wrap.id ? tortilla.id : bread.id, unitId: unitG.id, amount: recipe.type === pasta.id ? 400 : 100 },
        { ingredientId: tomato.id, unitId: unitG.id, amount: 200 },
      ],
    });
  }

  console.log('✅ Created 40 recipes');
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });