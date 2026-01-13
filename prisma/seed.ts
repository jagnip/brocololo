import 'dotenv/config';
import { prisma } from '../lib/db/index';
import slugify from 'slugify';

async function main() {
  console.log('🌱 Seeding database...');

  // Create categories
  const breakfast = await prisma.category.upsert({
    where: { slug: 'breakfast' },
    update: {},
    create: {
      name: 'Breakfast',
      slug: 'breakfast',
    },
  });

  const lunch = await prisma.category.upsert({
    where: { slug: 'lunch' },
    update: {},
    create: {
      name: 'Lunch',
      slug: 'lunch',
    },
  });

  const dinner = await prisma.category.upsert({
    where: { slug: 'dinner' },
    update: {},
    create: {
      name: 'Dinner',
      slug: 'dinner',
    },
  });

  console.log('✅ Created categories');

  // Helper function to get or create ingredient
  async function getOrCreateIngredient(name: string, supermarketUrl?: string) {
    const slug = slugify(name, { lower: true, strict: true, trim: true });
    return await prisma.ingredient.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        supermarketUrl: supermarketUrl || null,
      },
    });
  }

  // Create ingredients
  const bread = await getOrCreateIngredient('bread');
  const avocado = await getOrCreateIngredient('avocado');
  const salt = await getOrCreateIngredient('salt');
  const pepper = await getOrCreateIngredient('pepper');
  const lettuce = await getOrCreateIngredient('lettuce');
  const tomato = await getOrCreateIngredient('tomato');
  const chicken = await getOrCreateIngredient('chicken');
  const rice = await getOrCreateIngredient('rice');

  console.log('✅ Created ingredients');

  // Create Recipe 1: Avocado Toast
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
      nutrition: [
        'Calories: 250',
        'Protein: 8g',
        'Carbs: 30g',
        'Fat: 12g',
      ],
      categories: {
        connect: [{ id: breakfast.id }],
      },
      ingredients: {
        create: [
          {
            ingredient: { connect: { id: bread.id } },
            amount: '2 slices',
          },
          {
            ingredient: { connect: { id: avocado.id } },
            amount: '1 ripe',
          },
          {
            ingredient: { connect: { id: salt.id } },
            amount: 'to taste',
          },
          {
            ingredient: { connect: { id: pepper.id } },
            amount: 'to taste',
          },
        ],
      },
    },
  });

  // Create Recipe 2: Chicken Salad
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
      nutrition: [
        'Calories: 200',
        'Protein: 25g',
        'Carbs: 10g',
        'Fat: 8g',
      ],
      categories: {
        connect: [{ id: lunch.id }],
      },
      ingredients: {
        create: [
          {
            ingredient: { connect: { id: chicken.id } },
            amount: '300g',
          },
          {
            ingredient: { connect: { id: lettuce.id } },
            amount: '1 head',
          },
          {
            ingredient: { connect: { id: tomato.id } },
            amount: '2 medium',
          },
          {
            ingredient: { connect: { id: salt.id } },
            amount: 'to taste',
          },
          {
            ingredient: { connect: { id: pepper.id } },
            amount: 'to taste',
          },
        ],
      },
    },
  });

  // Create Recipe 3: Chicken and Rice
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
      nutrition: [
        'Calories: 400',
        'Protein: 35g',
        'Carbs: 45g',
        'Fat: 10g',
      ],
      categories: {
        connect: [{ id: dinner.id }],
      },
      ingredients: {
        create: [
          {
            ingredient: { connect: { id: chicken.id } },
            amount: '500g',
          },
          {
            ingredient: { connect: { id: rice.id } },
            amount: '2 cups',
          },
          {
            ingredient: { connect: { id: salt.id } },
            amount: 'to taste',
          },
          {
            ingredient: { connect: { id: pepper.id } },
            amount: 'to taste',
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