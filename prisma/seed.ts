import 'dotenv/config';
import { prisma } from '../lib/db/index';
import slugify from 'slugify';

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (order matters due to foreign keys)
  await prisma.recipeIngredient.deleteMany();
  await prisma.ingredientUnit.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.category.deleteMany();

  // Create categories
  const breakfast = await prisma.category.create({
    data: {
      name: 'Breakfast',
      slug: 'breakfast',
    },
  });

  const lunch = await prisma.category.create({
    data: {
      name: 'Lunch',
      slug: 'lunch',
    },
  });

  const dinner = await prisma.category.create({
    data: {
      name: 'Dinner',
      slug: 'dinner',
    },
  });

  console.log('✅ Created categories');

  // Create units
  const unitG = await prisma.unit.create({
    data: { name: 'g' },
  });

  const unitSlice = await prisma.unit.create({
    data: { name: 'slice' },
  });

  console.log('✅ Created units');

  const supermarketUrl = 'https://www.continente.pt/produto/lombos-de-bacalhau-12-meses-de-cura-msc-gourmet-ultracongelado-riberalves-riberalves-6364533.html';

  // Create ingredients with nutritional data per 100g
  const bread = await prisma.ingredient.create({
    data: {
      name: 'Whole Wheat Bread',
      slug: 'whole-wheat-bread',
      supermarketUrl: supermarketUrl,
      calories: 247,
      proteins: 13.0,
      fats: 4.2,
      carbs: 41.0,
    },
  });

  const chicken = await prisma.ingredient.create({
    data: {
      name: 'Chicken Breast',
      slug: 'chicken-breast',
      supermarketUrl: supermarketUrl,
      calories: 165,
      proteins: 31.0,
      fats: 3.6,
      carbs: 0.0,
    },
  });

  const rice = await prisma.ingredient.create({
    data: {
      name: 'White Rice',
      slug: 'white-rice',
      supermarketUrl: supermarketUrl,
      calories: 130,
      proteins: 2.7,
      fats: 0.3,
      carbs: 28.0,
    },
  });

  console.log('✅ Created ingredients');

  // Create unit conversions for each ingredient
  // Bread: g, slice
  await prisma.ingredientUnit.create({
    data: {
      ingredientId: bread.id,
      unitId: unitG.id,
      gramsPerUnit: 1,
    },
  });

  await prisma.ingredientUnit.create({
    data: {
      ingredientId: bread.id,
      unitId: unitSlice.id,
      gramsPerUnit: 35, // 1 slice ≈ 35g
    },
  });

  // Chicken: g
  await prisma.ingredientUnit.create({
    data: {
      ingredientId: chicken.id,
      unitId: unitG.id,
      gramsPerUnit: 1,
    },
  });

  // Rice: g
  await prisma.ingredientUnit.create({
    data: {
      ingredientId: rice.id,
      unitId: unitG.id,
      gramsPerUnit: 1,
    },
  });

  console.log('✅ Created unit conversions');

  // Recipe 1: Avocado Toast (using bread)
  await prisma.recipe.create({
    data: {
      name: 'Avocado Toast',
      slug: 'avocado-toast',
      imageUrl: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800',
      handsOnTime: 5,
      servings: 2,
      instructions: [
        'Toast the bread until golden brown',
        'Mash the avocado with a fork',
        'Spread avocado on toast',
        'Season with salt and pepper',
      ],
      notes: [
        'Use ripe but not mushy avocados',
      ],
      categories: {
        connect: [{ id: breakfast.id }],
      },
      ingredients: {
        create: [
          {
            ingredientId: bread.id,
            unitId: unitSlice.id,
            amount: 2, // 2 slices of bread
          },
        ],
      },
    },
  });

  // Recipe 2: Chicken Salad (using chicken)
  await prisma.recipe.create({
    data: {
      name: 'Chicken Salad',
      slug: 'chicken-salad',
      imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800',
      handsOnTime: 15,
      servings: 4,
      instructions: [
        'Cook and shred the chicken',
        'Wash and chop the lettuce',
        'Dice the tomatoes',
        'Mix everything together',
        'Season with salt and pepper',
      ],
      notes: [
        'Best served fresh',
      ],
      categories: {
        connect: [{ id: lunch.id }],
      },
      ingredients: {
        create: [
          {
            ingredientId: chicken.id,
            unitId: unitG.id,
            amount: 300, // 300g of chicken breast
          },
        ],
      },
    },
  });

  // Recipe 3: Chicken and Rice (using chicken and rice)
  await prisma.recipe.create({
    data: {
      name: 'Chicken and Rice',
      slug: 'chicken-and-rice',
      imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
      handsOnTime: 30,
      servings: 4,
      instructions: [
        'Cook the rice according to package instructions',
        'Season and cook the chicken',
        'Serve chicken over rice',
        'Season with salt and pepper',
      ],
      notes: [
        'Great for meal prep',
      ],
      categories: {
        connect: [{ id: dinner.id }],
      },
      ingredients: {
        create: [
          {
            ingredientId: chicken.id,
            unitId: unitG.id,
            amount: 500, // 500g of chicken breast
          },
          {
            ingredientId: rice.id,
            unitId: unitG.id,
            amount: 400, // 400g of cooked rice
          },
        ],
      },
    },
  });

  console.log('✅ Created recipes with ingredients');
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