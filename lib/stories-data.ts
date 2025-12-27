import type { RecipeType } from "@/types/recipe";

export const storyRecipes: RecipeType[] = [
  {
    id: 1,
    name: "Classic Spaghetti Bolognese",
    slug: "classic-spaghetti-bolognese",
    photo:
      "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&h=600&fit=crop",
    instructions: [
      "Heat olive oil in a large pan over medium heat.",
      "Add chopped onions and cook until translucent.",
      "Add ground beef and cook until browned.",
    ],
    "hands-on-time": 45,
    nutrition: ["Calories: 520", "Protein: 28g", "Carbs: 65g", "Fat: 15g"],
    ingredients: ["500g ground beef", "400g spaghetti", "1 large onion, diced"],
    notes: ["Best served hot", "Pairs well with red wine"],
    portions: 4,
    categorySlugs: ["italian", "main-course"],
  },
  {
    id: 2,
    name: "Quick Avocado Toast",
    slug: "quick-avocado-toast",
    photo:
      "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800&h=600&fit=crop",
    instructions: [
      "Toast bread slices.",
      "Mash avocado with salt and pepper.",
      "Spread on toast and enjoy.",
    ],
    "hands-on-time": 5,
    nutrition: ["Calories: 250", "Protein: 8g", "Carbs: 30g", "Fat: 12g"],
    ingredients: ["2 slices bread", "1 avocado", "Salt and pepper"],
    notes: ["Perfect for breakfast"],
    portions: 1,
    categorySlugs: ["all", "vegetarian"],
  },
  {
    id: 3,
    name: "Chocolate Chip Cookies",
    slug: "chocolate-chip-cookies",
    photo:
      "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&h=600&fit=crop",
    instructions: [
      "Mix flour, sugar, and butter.",
      "Add chocolate chips.",
      "Bake at 350°F for 12 minutes.",
    ],
    "hands-on-time": 30,
    nutrition: ["Calories: 150", "Protein: 2g", "Carbs: 20g", "Fat: 7g"],
    ingredients: ["2 cups flour", "1 cup sugar", "1 cup chocolate chips"],
    notes: ["Store in airtight container"],
    portions: 24,
    categorySlugs: ["dessert", "baking"],
  },
  {
    id: 4,
    name: "Caesar Salad",
    slug: "caesar-salad",
    photo:
      "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&h=600&fit=crop",
    instructions: [
      "Wash and chop romaine lettuce.",
      "Make Caesar dressing.",
      "Toss with croutons and parmesan.",
    ],
    "hands-on-time": 15,
    nutrition: ["Calories: 200", "Protein: 5g", "Carbs: 10g", "Fat: 15g"],
    ingredients: ["Romaine lettuce", "Caesar dressing", "Croutons", "Parmesan"],
    notes: ["Serve immediately"],
    portions: 4,
    categorySlugs: ["salad", "vegetarian"],
  },
  {
    id: 5,
    name: "Grilled Salmon",
    slug: "grilled-salmon",
    photo:
      "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&h=600&fit=crop",
    instructions: [
      "Season salmon fillets.",
      "Grill for 6-8 minutes per side.",
      "Serve with lemon.",
    ],
    "hands-on-time": 20,
    nutrition: ["Calories: 350", "Protein: 35g", "Carbs: 0g", "Fat: 20g"],
    ingredients: ["4 salmon fillets", "Lemon", "Salt and pepper"],
    notes: ["Don't overcook"],
    portions: 4,
    categorySlugs: ["seafood", "main-course"],
  },
  {
    id: 6,
    name: "Margherita Pizza",
    slug: "margherita-pizza",
    photo:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&h=600&fit=crop",
    instructions: [
      "Prepare pizza dough.",
      "Add tomato sauce and mozzarella.",
      "Bake at 450°F for 12 minutes.",
    ],
    "hands-on-time": 60,
    nutrition: ["Calories: 280", "Protein: 12g", "Carbs: 35g", "Fat: 10g"],
    ingredients: ["Pizza dough", "Tomato sauce", "Mozzarella", "Basil"],
    notes: ["Best with fresh mozzarella"],
    portions: 4,
    categorySlugs: ["italian", "main-course"],
  },
];


