// prisma/seed.ts

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
      parentId: sweet.id,  // Link to sweet
    },
  });

  const cookies = await prisma.category.create({
    data: {
      name: 'Cookies',
      slug: 'cookies',
      type: 'RECIPE_TYPE',
      parentId: sweet.id,  // Link to sweet
    },
  });

  const pancakes = await prisma.category.create({
    data: {
      name: 'Pancakes',
      slug: 'pancakes',
      type: 'RECIPE_TYPE',
      parentId: sweet.id,  // Link to sweet
    },
  });

  const oats = await prisma.category.create({
    data: {
      name: 'Oats',
      slug: 'oats',
      type: 'RECIPE_TYPE',
      parentId: sweet.id,  // Link to sweet
    },
  });

  const wrap = await prisma.category.create({
    data: {
      name: 'Wrap',
      slug: 'wrap',
      type: 'RECIPE_TYPE',
      parentId: savoury.id,  // Link to savoury
    },
  });

  const sandwich = await prisma.category.create({
    data: {
      name: 'Sandwich',
      slug: 'sandwich',
      type: 'RECIPE_TYPE',
      parentId: savoury.id,  // Link to savoury
    },
  });

  const pasta = await prisma.category.create({
    data: {
      name: 'Pasta',
      slug: 'pasta',
      type: 'RECIPE_TYPE',
      parentId: savoury.id,  // Link to savoury
    },
  });

  // PROTEIN categories have no parent:
  const chicken = await prisma.category.create({
    data: {
      name: 'Chicken',
      slug: 'chicken',
      type: 'PROTEIN',
      // parentId: null (default)
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

  // Create ingredients with nutritional data per 100g
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

  const pastaIngredient = await prisma.ingredient.create({
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

  const chickenIngredient = await prisma.ingredient.create({
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

  const rolledOats = await prisma.ingredient.create({
    data: {
      name: 'Rolled Oats',
      slug: 'rolled-oats',
      supermarketUrl: supermarketUrl,
      calories: 389,
      proteins: 16.9,
      fats: 6.9,
      carbs: 66.3,
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
      gramsPerUnit: 0.92,
    },
  });

  await prisma.ingredientUnit.create({
    data: {
      ingredientId: oliveOil.id,
      unitId: unitTbsp.id,
      gramsPerUnit: 13.8,
    },
  });

  // Pasta: g
  await prisma.ingredientUnit.create({
    data: {
      ingredientId: pastaIngredient.id,
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
      gramsPerUnit: 120,
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
      gramsPerUnit: 200,
    },
  });

  await prisma.ingredientUnit.create({
    data: {
      ingredientId: sugar.id,
      unitId: unitTbsp.id,
      gramsPerUnit: 12.5,
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
      gramsPerUnit: 14.2,
    },
  });

  // Eggs: g
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
      gramsPerUnit: 1.03,
    },
  });

  await prisma.ingredientUnit.create({
    data: {
      ingredientId: milk.id,
      unitId: unitCup.id,
      gramsPerUnit: 240,
    },
  });

  // Chicken: g
  await prisma.ingredientUnit.create({
    data: {
      ingredientId: chickenIngredient.id,
      unitId: unitG.id,
      gramsPerUnit: 1,
    },
  });

  // Rolled Oats: g, cup
  await prisma.ingredientUnit.create({
    data: {
      ingredientId: rolledOats.id,
      unitId: unitG.id,
      gramsPerUnit: 1,
    },
  });

  await prisma.ingredientUnit.create({
    data: {
      ingredientId: rolledOats.id,
      unitId: unitCup.id,
      gramsPerUnit: 100,
    },
  });

  console.log('✅ Created unit conversions');

  // Recipe 1: Tomato Pasta (Savoury, Pasta, no protein)
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
        connect: [
          { id: savoury.id }, // FLAVOUR
          { id: pasta.id },   // RECIPE_TYPE
        ],
      },
      ingredients: {
        create: [
          {
            ingredientId: pastaIngredient.id,
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

  // Recipe 2: Chocolate Chip Cookies (Sweet, Cookies, no protein)
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
        connect: [
          { id: sweet.id },     // FLAVOUR
          { id: cookies.id },   // RECIPE_TYPE
        ],
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

  // Recipe 3: Classic Pancakes (Sweet, Pancakes, no protein)
  const pancakesRecipe = await prisma.recipe.create({
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
        connect: [
          { id: sweet.id },       // FLAVOUR
          { id: pancakes.id },   // RECIPE_TYPE
        ],
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

  // Recipe 4: Overnight Oats (Sweet, Oats, no protein)
  const overnightOats = await prisma.recipe.create({
    data: {
      name: 'Overnight Oats',
      slug: 'overnight-oats',
      handsOnTime: 5,
      servings: 2,
      instructions: [
        'In a jar or bowl, combine rolled oats, milk, and yogurt',
        'Add chia seeds, honey or maple syrup, and vanilla extract',
        'Stir everything together until well combined',
        'Cover and refrigerate overnight (at least 6 hours)',
        'In the morning, stir the oats and add your favorite toppings',
        'Serve cold or at room temperature',
      ],
      notes: [
        'Make multiple jars at once for meal prep',
        'Can be stored in the fridge for up to 5 days',
        'Customize with your favorite fruits and nuts',
      ],
      categories: {
        connect: [
          { id: sweet.id },   // FLAVOUR
          { id: oats.id },    // RECIPE_TYPE
        ],
      },
      ingredients: {
        create: [
          {
            ingredientId: rolledOats.id,
            unitId: unitG.id,
            amount: 100,
          },
          {
            ingredientId: milk.id,
            unitId: unitMl.id,
            amount: 200,
          },
        ],
      },
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1575925510742-0d93b13c0c4a?w=800',
            isCover: true,
          },
        ],
      },
    },
  });

  // Recipe 5: Chicken Wrap (Savoury, Wrap, Chicken protein)
  const chickenWrap = await prisma.recipe.create({
    data: {
      name: 'Chicken Wrap',
      slug: 'chicken-wrap',
      handsOnTime: 15,
      servings: 2,
      instructions: [
        'Season chicken breast with salt and pepper',
        'Cook chicken in a pan over medium heat until cooked through',
        'Slice chicken into strips',
        'Warm tortilla wraps',
        'Add chicken, vegetables, and sauce to wrap',
        'Roll tightly and serve',
      ],
      notes: [
        'Use fresh vegetables for best flavor',
        'Warm the wrap slightly to make it more pliable',
      ],
      categories: {
        connect: [
          { id: savoury.id },  // FLAVOUR
          { id: wrap.id },     // RECIPE_TYPE
          { id: chicken.id },  // PROTEIN
        ],
      },
      ingredients: {
        create: [
          {
            ingredientId: chickenIngredient.id,
            unitId: unitG.id,
            amount: 200,
          },
          {
            ingredientId: tomato.id,
            unitId: unitG.id,
            amount: 100,
          },
          {
            ingredientId: onion.id,
            unitId: unitG.id,
            amount: 50,
          },
        ],
      },
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800',
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