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

  // Create 2 categories
  const vegetarian = await prisma.category.create({
    data: {
      name: 'Vegetarian',
      slug: 'vegetarian',
    },
  });

  const dessert = await prisma.category.create({
    data: {
      name: 'Dessert',
      slug: 'dessert',
    },
  });

  console.log('✅ Created categories');

  // Create units
  const unitG = await prisma.unit.create({
    data: { name: 'g' },
  });

  const unitMl = await prisma.unit.create({
    data: { name: 'ml' },
  });

  const unitTbsp = await prisma.unit.create({
    data: { name: 'tbsp' },
  });

  const unitTsp = await prisma.unit.create({
    data: { name: 'tsp' },
  });

  const unitCup = await prisma.unit.create({
    data: { name: 'cup' },
  });

  console.log('✅ Created units');

  const supermarketUrl = 'https://www.continente.pt/produto/lombos-de-bacalhau-12-meses-de-cura-msc-gourmet-ultracongelado-riberalves-riberalves-6364533.html';

  // Create 10 ingredients with nutritional data per 100g
  const tomato = await prisma.ingredient.create({
    data: {
      name: 'Tomato',
      slug: 'tomato',
      supermarketUrl: supermarketUrl,
      calories: 18,
      proteins: 0.9,
      fats: 0.2,
      carbs: 3.9,
    },
  });

  const onion = await prisma.ingredient.create({
    data: {
      name: 'Onion',
      slug: 'onion',
      supermarketUrl: supermarketUrl,
      calories: 40,
      proteins: 1.1,
      fats: 0.1,
      carbs: 9.3,
    },
  });

  const garlic = await prisma.ingredient.create({
    data: {
      name: 'Garlic',
      slug: 'garlic',
      supermarketUrl: supermarketUrl,
      calories: 149,
      proteins: 6.4,
      fats: 0.5,
      carbs: 33.1,
    },
  });

  const oliveOil = await prisma.ingredient.create({
    data: {
      name: 'Olive Oil',
      slug: 'olive-oil',
      supermarketUrl: supermarketUrl,
      calories: 884,
      proteins: 0.0,
      fats: 100.0,
      carbs: 0.0,
    },
  });

  const pasta = await prisma.ingredient.create({
    data: {
      name: 'Pasta',
      slug: 'pasta',
      supermarketUrl: supermarketUrl,
      calories: 131,
      proteins: 5.0,
      fats: 1.1,
      carbs: 25.0,
    },
  });

  const flour = await prisma.ingredient.create({
    data: {
      name: 'All-Purpose Flour',
      slug: 'all-purpose-flour',
      supermarketUrl: supermarketUrl,
      calories: 364,
      proteins: 10.3,
      fats: 1.0,
      carbs: 76.3,
    },
  });

  const sugar = await prisma.ingredient.create({
    data: {
      name: 'Granulated Sugar',
      slug: 'granulated-sugar',
      supermarketUrl: supermarketUrl,
      calories: 387,
      proteins: 0.0,
      fats: 0.0,
      carbs: 100.0,
    },
  });

  const butter = await prisma.ingredient.create({
    data: {
      name: 'Butter',
      slug: 'butter',
      supermarketUrl: supermarketUrl,
      calories: 717,
      proteins: 0.9,
      fats: 81.1,
      carbs: 0.1,
    },
  });

  const eggs = await prisma.ingredient.create({
    data: {
      name: 'Eggs',
      slug: 'eggs',
      supermarketUrl: supermarketUrl,
      calories: 155,
      proteins: 13.0,
      fats: 11.0,
      carbs: 1.1,
    },
  });

  const milk = await prisma.ingredient.create({
    data: {
      name: 'Whole Milk',
      slug: 'whole-milk',
      supermarketUrl: supermarketUrl,
      calories: 61,
      proteins: 3.2,
      fats: 3.3,
      carbs: 4.8,
    },
  });

  console.log('✅ Created ingredients');

  // Create unit conversions for ingredients
  // Tomato: g
  await prisma.ingredientUnit.create({
    data: {
      ingredientId: tomato.id,
      unitId: unitG.id,
      gramsPerUnit: 1,
    },
  });

  // Onion: g
  await prisma.ingredientUnit.create({
    data: {
      ingredientId: onion.id,
      unitId: unitG.id,
      gramsPerUnit: 1,
    },
  });

  // Garlic: g
  await prisma.ingredientUnit.create({
    data: {
      ingredientId: garlic.id,
      unitId: unitG.id,
      gramsPerUnit: 1,
    },
  });

  // Olive Oil: ml, tbsp
  await prisma.ingredientUnit.create({
    data: {
      ingredientId: oliveOil.id,
      unitId: unitMl.id,
      gramsPerUnit: 0.92, // 1ml ≈ 0.92g
    },
  });

  await prisma.ingredientUnit.create({
    data: {
      ingredientId: oliveOil.id,
      unitId: unitTbsp.id,
      gramsPerUnit: 13.8, // 1 tbsp ≈ 15ml ≈ 13.8g
    },
  });

  // Pasta: g
  await prisma.ingredientUnit.create({
    data: {
      ingredientId: pasta.id,
      unitId: unitG.id,
      gramsPerUnit: 1,
    },
  });

  // Flour: g, cup
  await prisma.ingredientUnit.create({
    data: {
      ingredientId: flour.id,
      unitId: unitG.id,
      gramsPerUnit: 1,
    },
  });

  await prisma.ingredientUnit.create({
    data: {
      ingredientId: flour.id,
      unitId: unitCup.id,
      gramsPerUnit: 120, // 1 cup ≈ 120g
    },
  });

  // Sugar: g, cup, tbsp
  await prisma.ingredientUnit.create({
    data: {
      ingredientId: sugar.id,
      unitId: unitG.id,
      gramsPerUnit: 1,
    },
  });

  await prisma.ingredientUnit.create({
    data: {
      ingredientId: sugar.id,
      unitId: unitCup.id,
      gramsPerUnit: 200, // 1 cup ≈ 200g
    },
  });

  await prisma.ingredientUnit.create({
    data: {
      ingredientId: sugar.id,
      unitId: unitTbsp.id,
      gramsPerUnit: 12.5, // 1 tbsp ≈ 12.5g
    },
  });

  // Butter: g, tbsp
  await prisma.ingredientUnit.create({
    data: {
      ingredientId: butter.id,
      unitId: unitG.id,
      gramsPerUnit: 1,
    },
  });

  await prisma.ingredientUnit.create({
    data: {
      ingredientId: butter.id,
      unitId: unitTbsp.id,
      gramsPerUnit: 14.2, // 1 tbsp ≈ 14.2g
    },
  });

  // Eggs: g (per egg ≈ 50g)
  await prisma.ingredientUnit.create({
    data: {
      ingredientId: eggs.id,
      unitId: unitG.id,
      gramsPerUnit: 1,
    },
  });

  // Milk: ml, cup
  await prisma.ingredientUnit.create({
    data: {
      ingredientId: milk.id,
      unitId: unitMl.id,
      gramsPerUnit: 1.03, // 1ml ≈ 1.03g
    },
  });

  await prisma.ingredientUnit.create({
    data: {
      ingredientId: milk.id,
      unitId: unitCup.id,
      gramsPerUnit: 240, // 1 cup ≈ 240ml ≈ 247g
    },
  });

  console.log('✅ Created unit conversions');

  // Recipe 1: Tomato Pasta (Vegetarian)
  const tomatoPasta = await prisma.recipe.create({
    data: {
      name: 'Tomato Pasta',
      slug: 'tomato-pasta',
      handsOnTime: 20,
      servings: 4,
      instructions: [
        'Bring a large pot of salted water to a boil',
        'Add pasta and cook according to package instructions',
        'Meanwhile, heat olive oil in a large pan over medium heat',
        'Add chopped onion and cook until translucent, about 5 minutes',
        'Add minced garlic and cook for 1 minute',
        'Add diced tomatoes and cook for 10 minutes until softened',
        'Season with salt and pepper',
        'Drain pasta and toss with the tomato sauce',
        'Serve immediately with fresh basil if desired',
      ],
      notes: [
        'Use fresh, ripe tomatoes for best flavor',
        'Reserve some pasta water to adjust sauce consistency',
      ],
      categories: {
        connect: [{ id: vegetarian.id }],
      },
      ingredients: {
        create: [
          {
            ingredientId: pasta.id,
            unitId: unitG.id,
            amount: 400,
          },
          {
            ingredientId: tomato.id,
            unitId: unitG.id,
            amount: 600,
          },
          {
            ingredientId: onion.id,
            unitId: unitG.id,
            amount: 150,
          },
          {
            ingredientId: garlic.id,
            unitId: unitG.id,
            amount: 10,
          },
          {
            ingredientId: oliveOil.id,
            unitId: unitTbsp.id,
            amount: 2,
          },
        ],
      },
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800',
            isCover: true,
          },
        ],
      },
    },
  });

  // Recipe 2: Chocolate Chip Cookies (Dessert)
  const chocolateCookies = await prisma.recipe.create({
    data: {
      name: 'Chocolate Chip Cookies',
      slug: 'chocolate-chip-cookies',
      handsOnTime: 15,
      servings: 24,
      instructions: [
        'Preheat oven to 375°F (190°C)',
        'Cream together butter and sugar until light and fluffy',
        'Beat in eggs one at a time',
        'Gradually mix in flour until just combined',
        'Fold in chocolate chips',
        'Drop rounded tablespoons of dough onto ungreased baking sheets',
        'Bake for 9-11 minutes until golden brown',
        'Cool on baking sheet for 2 minutes before transferring to wire rack',
      ],
      notes: [
        'Don\'t overmix the dough for chewier cookies',
        'For crispier cookies, bake a minute or two longer',
      ],
      categories: {
        connect: [{ id: dessert.id }],
      },
      ingredients: {
        create: [
          {
            ingredientId: flour.id,
            unitId: unitCup.id,
            amount: 2.25,
          },
          {
            ingredientId: sugar.id,
            unitId: unitCup.id,
            amount: 0.75,
          },
          {
            ingredientId: butter.id,
            unitId: unitTbsp.id,
            amount: 12,
          },
          {
            ingredientId: eggs.id,
            unitId: unitG.id,
            amount: 100,
          },
        ],
      },
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800',
            isCover: true,
          },
        ],
      },
    },
  });

  // Recipe 3: Pancakes (Dessert - can also be breakfast, but using dessert category)
  const pancakes = await prisma.recipe.create({
    data: {
      name: 'Classic Pancakes',
      slug: 'classic-pancakes',
      handsOnTime: 10,
      servings: 8,
      instructions: [
        'In a large bowl, whisk together flour and sugar',
        'In another bowl, beat eggs and milk together',
        'Melt butter and add to the egg mixture',
        'Pour wet ingredients into dry ingredients and stir until just combined',
        'Heat a lightly oiled griddle or frying pan over medium-high heat',
        'Pour batter onto the griddle, using approximately 1/4 cup for each pancake',
        'Cook until bubbles form and edges are dry, about 2-3 minutes',
        'Flip and cook until browned on the other side',
        'Repeat with remaining batter',
      ],
      notes: [
        'Don\'t overmix - a few lumps are okay',
        'Let the batter rest for 5 minutes for fluffier pancakes',
      ],
      categories: {
        connect: [{ id: dessert.id }],
      },
      ingredients: {
        create: [
          {
            ingredientId: flour.id,
            unitId: unitCup.id,
            amount: 1.5,
          },
          {
            ingredientId: sugar.id,
            unitId: unitTbsp.id,
            amount: 2,
          },
          {
            ingredientId: eggs.id,
            unitId: unitG.id,
            amount: 100,
          },
          {
            ingredientId: milk.id,
            unitId: unitCup.id,
            amount: 1.25,
          },
          {
            ingredientId: butter.id,
            unitId: unitTbsp.id,
            amount: 3,
          },
        ],
      },
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
            isCover: true,
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