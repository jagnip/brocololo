import 'dotenv/config';  
import { prisma } from '../lib/db/index';

async function main() {
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

  // Create recipes
  const avocadoToast = await prisma.recipe.upsert({
    where: { slug: 'avocado-toast' },
    update: {},
    create: {
      name: 'Avocado Toast',
      slug: 'avocado-toast',
      imageUrl: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800',
      handsOnTime: 5,
      servings: 2,
      instructions: [
        'Toast the bread until golden brown',
        'Mash the avocado with a fork',
        'Spread avocado on toast',
        'Season with salt, pepper, and red pepper flakes',
        'Top with cherry tomatoes and serve',
      ],
      ingredients: [
        '2 slices sourdough bread',
        '1 ripe avocado',
        'Salt and pepper to taste',
        'Red pepper flakes',
        'Cherry tomatoes, halved',
      ],
      notes: [
        'Use ripe but not mushy avocados',
        'Add a squeeze of lemon for extra flavor',
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
    },
  });

  const caesarSalad = await prisma.recipe.upsert({
    where: { slug: 'caesar-salad' },
    update: {},
    create: {
      name: 'Caesar Salad',
      slug: 'caesar-salad',
      imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800',
      handsOnTime: 15,
      servings: 4,
      instructions: [
        'Wash and dry romaine lettuce, then tear into bite-sized pieces',
        'Make the dressing: mix mayonnaise, parmesan, lemon juice, and garlic',
        'Toss lettuce with dressing',
        'Top with croutons and additional parmesan',
        'Serve immediately',
      ],
      ingredients: [
        '1 head romaine lettuce',
        '1/2 cup mayonnaise',
        '1/4 cup grated parmesan',
        '2 tbsp lemon juice',
        '2 cloves garlic, minced',
        '1 cup croutons',
      ],
      notes: [
        'Make sure lettuce is completely dry for best results',
        'Add grilled chicken for a complete meal',
      ],
      nutrition: [
        'Calories: 180',
        'Protein: 5g',
        'Carbs: 12g',
        'Fat: 14g',
      ],
      categories: {
        connect: [{ id: lunch.id }],
      },
    },
  });

  const grilledSalmon = await prisma.recipe.upsert({
    where: { slug: 'grilled-salmon' },
    update: {},
    create: {
      name: 'Grilled Salmon',
      slug: 'grilled-salmon',
      imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
      handsOnTime: 20,
      servings: 4,
      instructions: [
        'Preheat grill to medium-high heat',
        'Season salmon fillets with salt, pepper, and olive oil',
        'Grill salmon skin-side down for 4-5 minutes',
        'Flip and cook for another 3-4 minutes',
        'Remove from grill and let rest for 2 minutes',
        'Serve with lemon wedges',
      ],
      ingredients: [
        '4 salmon fillets (150g each)',
        '2 tbsp olive oil',
        'Salt and pepper to taste',
        '1 lemon, cut into wedges',
        'Fresh dill for garnish',
      ],
      notes: [
        'Don\'t overcook - salmon should be slightly pink in center',
        'Grill marks add great flavor',
      ],
      nutrition: [
        'Calories: 320',
        'Protein: 35g',
        'Carbs: 2g',
        'Fat: 18g',
      ],
      categories: {
        connect: [{ id: dinner.id }],
      },
    },
  });

  console.log('✅ Created recipes');
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