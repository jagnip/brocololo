import type { RecipeType } from "@/types/recipe";

export const recipesData: RecipeType[] = [
  {
    id: 1,
    name: "Classic Spaghetti Bolognese",
    photo: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&h=600&fit=crop",
    instructions: [
      "Heat olive oil in a large pan over medium heat. Add chopped onions and cook until translucent, about 5 minutes.",
      "Add minced garlic and cook for 1 minute until fragrant.",
      "Add ground beef and cook until browned, breaking it up with a spoon, about 8-10 minutes.",
      "Pour in crushed tomatoes, tomato paste, and season with salt, pepper, and Italian herbs. Simmer for 30 minutes.",
      "Meanwhile, cook spaghetti according to package directions until al dente.",
      "Drain pasta and serve with the bolognese sauce. Top with grated Parmesan cheese."
    ],
    "hands-on-time": 45,
    nutrition: ["Calories: 520", "Protein: 28g", "Carbs: 65g", "Fat: 15g"],
    ingredients: [
      "500g ground beef",
      "400g spaghetti",
      "1 large onion, diced",
      "3 cloves garlic, minced",
      "800g crushed tomatoes",
      "2 tbsp tomato paste",
      "2 tbsp olive oil",
      "1 tsp dried oregano",
      "Salt and pepper to taste",
      "Parmesan cheese for serving"
    ],
    notes: [
      "For a richer flavor, use a mix of ground beef and pork.",
      "The sauce can be made ahead and frozen for up to 3 months.",
      "Add a splash of red wine for extra depth of flavor."
    ],
    portions: 4,
    categorySlugs: ["italian", "main-course"]
  },
  {
    id: 2,
    name: "Chicken Tikka Masala",
    photo: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&h=600&fit=crop",
    instructions: [
      "Cut chicken into bite-sized pieces and marinate in yogurt, lemon juice, and spices for at least 2 hours.",
      "Heat oil in a large pan and cook the marinated chicken until golden, about 8-10 minutes. Set aside.",
      "In the same pan, sauté onions until soft, then add ginger and garlic paste.",
      "Add tomato puree, cream, and garam masala. Simmer for 10 minutes.",
      "Return chicken to the pan and cook for another 5 minutes until heated through.",
      "Garnish with fresh cilantro and serve with basmati rice or naan bread."
    ],
    "hands-on-time": 60,
    nutrition: ["Calories: 450", "Protein: 35g", "Carbs: 20g", "Fat: 25g"],
    ingredients: [
      "600g chicken breast, cubed",
      "200ml heavy cream",
      "400g tomato puree",
      "1 large onion, sliced",
      "2 tbsp ginger-garlic paste",
      "200g Greek yogurt",
      "2 tbsp garam masala",
      "1 tsp turmeric",
      "1 tsp cumin",
      "2 tbsp vegetable oil",
      "Fresh cilantro for garnish"
    ],
    notes: [
      "Marinating overnight will give the best flavor.",
      "Adjust the cream amount to control the spiciness.",
      "Serve with basmati rice and cucumber raita."
    ],
    portions: 4,
    categorySlugs: ["indian", "main-course"]
  },
  {
    id: 3,
    name: "Chocolate Chip Cookies",
    photo: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&h=600&fit=crop",
    instructions: [
      "Preheat oven to 180°C (350°F). Line baking sheets with parchment paper.",
      "Cream together softened butter, brown sugar, and white sugar until light and fluffy.",
      "Beat in eggs one at a time, then stir in vanilla extract.",
      "Combine flour, baking soda, and salt in a separate bowl. Gradually mix into the butter mixture.",
      "Fold in chocolate chips until evenly distributed.",
      "Drop rounded tablespoons of dough onto prepared baking sheets, spacing them 5cm apart.",
      "Bake for 10-12 minutes until edges are golden but centers are still soft.",
      "Cool on baking sheet for 5 minutes before transferring to wire rack."
    ],
    "hands-on-time": 30,
    nutrition: ["Calories: 150", "Protein: 2g", "Carbs: 20g", "Fat: 7g"],
    ingredients: [
      "225g butter, softened",
      "150g brown sugar",
      "100g white sugar",
      "2 large eggs",
      "1 tsp vanilla extract",
      "280g all-purpose flour",
      "1 tsp baking soda",
      "1/2 tsp salt",
      "300g chocolate chips"
    ],
    notes: [
      "For chewier cookies, slightly underbake them.",
      "Chill the dough for 30 minutes for thicker cookies.",
      "Store in an airtight container for up to 1 week."
    ],
    portions: 24,
    categorySlugs: ["dessert", "baking"]
  },
  {
    id: 4,
    name: "Caesar Salad",
    photo: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&h=600&fit=crop",
    instructions: [
      "Wash and dry romaine lettuce thoroughly. Tear into bite-sized pieces.",
      "Make the dressing by whisking together mayonnaise, lemon juice, garlic, anchovy paste, and Parmesan.",
      "In a large bowl, combine lettuce with croutons.",
      "Drizzle dressing over the salad and toss gently to coat.",
      "Top with additional Parmesan cheese and freshly ground black pepper.",
      "Serve immediately."
    ],
    "hands-on-time": 15,
    nutrition: ["Calories: 180", "Protein: 8g", "Carbs: 10g", "Fat: 12g"],
    ingredients: [
      "2 heads romaine lettuce",
      "100g croutons",
      "50g Parmesan cheese, grated",
      "4 tbsp mayonnaise",
      "2 tbsp lemon juice",
      "2 cloves garlic, minced",
      "1 tsp anchovy paste",
      "Black pepper to taste"
    ],
    notes: [
      "For best results, use fresh romaine lettuce.",
      "Add grilled chicken for a complete meal.",
      "The dressing can be made ahead and stored in the refrigerator."
    ],
    portions: 4,
    categorySlugs: ["salad", "vegetarian"]
  },
  {
    id: 5,
    name: "Beef Tacos",
    photo: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&h=600&fit=crop",
    instructions: [
      "Heat a large skillet over medium-high heat. Add ground beef and cook until browned, about 8 minutes.",
      "Drain excess fat and add taco seasoning. Stir in 1/4 cup water and simmer for 5 minutes.",
      "Warm taco shells in the oven according to package directions.",
      "Prepare toppings: dice tomatoes, shred lettuce, grate cheese, and slice onions.",
      "Fill each taco shell with seasoned beef, then top with your choice of toppings.",
      "Serve immediately with lime wedges and hot sauce."
    ],
    "hands-on-time": 25,
    nutrition: ["Calories: 320", "Protein: 20g", "Carbs: 25g", "Fat: 15g"],
    ingredients: [
      "500g ground beef",
      "8 taco shells",
      "2 tbsp taco seasoning",
      "2 tomatoes, diced",
      "1 cup shredded lettuce",
      "100g cheddar cheese, grated",
      "1/2 red onion, sliced",
      "Sour cream for serving",
      "Lime wedges",
      "Hot sauce"
    ],
    notes: [
      "Use lean ground beef for a healthier option.",
      "Warm the taco shells for a better texture.",
      "Customize with your favorite toppings like avocado or jalapeños."
    ],
    portions: 4,
    categorySlugs: ["mexican", "main-course"]
  },
  {
    id: 6,
    name: "Vegetable Stir Fry",
    photo: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&h=600&fit=crop",
    instructions: [
      "Cut all vegetables into uniform pieces for even cooking.",
      "Heat a wok or large pan over high heat. Add oil and swirl to coat.",
      "Add garlic and ginger, stir-fry for 30 seconds until fragrant.",
      "Add harder vegetables (carrots, broccoli) first and stir-fry for 2 minutes.",
      "Add remaining vegetables and continue stir-frying for 3-4 minutes until crisp-tender.",
      "Pour in soy sauce mixture and toss everything together.",
      "Serve immediately over steamed rice or noodles."
    ],
    "hands-on-time": 20,
    nutrition: ["Calories: 120", "Protein: 4g", "Carbs: 18g", "Fat: 4g"],
    ingredients: [
      "2 bell peppers, sliced",
      "200g broccoli florets",
      "2 carrots, julienned",
      "150g snow peas",
      "100g mushrooms, sliced",
      "3 cloves garlic, minced",
      "1 tbsp fresh ginger, grated",
      "3 tbsp soy sauce",
      "1 tbsp sesame oil",
      "2 tbsp vegetable oil"
    ],
    notes: [
      "Keep the heat high for the best stir-fry texture.",
      "Prepare all ingredients before starting to cook.",
      "Add protein like tofu or chicken for a complete meal."
    ],
    portions: 4,
    categorySlugs: ["asian", "vegetarian", "main-course"]
  },
  {
    id: 7,
    name: "Margherita Pizza",
    photo: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&h=600&fit=crop",
    instructions: [
      "Preheat oven to 250°C (480°F). If using a pizza stone, place it in the oven to heat.",
      "Roll out pizza dough on a floured surface to your desired thickness.",
      "Transfer dough to a pizza pan or parchment paper.",
      "Spread tomato sauce evenly over the dough, leaving a border for the crust.",
      "Top with fresh mozzarella slices and torn basil leaves.",
      "Drizzle with olive oil and season with salt.",
      "Bake for 10-12 minutes until crust is golden and cheese is bubbly.",
      "Remove from oven, let cool slightly, then slice and serve."
    ],
    "hands-on-time": 40,
    nutrition: ["Calories: 280", "Protein: 12g", "Carbs: 35g", "Fat: 10g"],
    ingredients: [
      "500g pizza dough",
      "200ml tomato sauce",
      "250g fresh mozzarella, sliced",
      "Fresh basil leaves",
      "2 tbsp olive oil",
      "Salt to taste"
    ],
    notes: [
      "Use a pizza stone for the crispiest crust.",
      "Don't overload with toppings to avoid a soggy center.",
      "Fresh mozzarella works best for authentic flavor."
    ],
    portions: 4,
    categorySlugs: ["italian", "main-course"]
  },
  {
    id: 8,
    name: "Chocolate Brownies",
    photo: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&h=600&fit=crop",
    instructions: [
      "Preheat oven to 180°C (350°F). Grease and line a 20cm square baking pan.",
      "Melt butter and chocolate together in a double boiler or microwave, stirring until smooth.",
      "Remove from heat and whisk in sugar until well combined.",
      "Beat in eggs one at a time, then add vanilla extract.",
      "Sift in flour, cocoa powder, and salt. Fold gently until just combined.",
      "Pour batter into prepared pan and spread evenly.",
      "Bake for 25-30 minutes until a toothpick inserted comes out with moist crumbs.",
      "Cool completely in the pan before cutting into squares."
    ],
    "hands-on-time": 45,
    nutrition: ["Calories: 220", "Protein: 3g", "Carbs: 28g", "Fat: 12g"],
    ingredients: [
      "200g dark chocolate, chopped",
      "150g butter",
      "200g granulated sugar",
      "3 large eggs",
      "1 tsp vanilla extract",
      "100g all-purpose flour",
      "30g cocoa powder",
      "1/4 tsp salt"
    ],
    notes: [
      "Don't overbake - brownies should be slightly fudgy in the center.",
      "Use high-quality chocolate for the best flavor.",
      "Store in an airtight container for up to 5 days."
    ],
    portions: 16,
    categorySlugs: ["dessert", "baking"]
  },
  {
    id: 9,
    name: "Grilled Salmon",
    photo: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&h=600&fit=crop",
    instructions: [
      "Preheat grill to medium-high heat. Clean and oil the grill grates.",
      "Pat salmon fillets dry and season both sides with salt, pepper, and lemon zest.",
      "Brush fillets with olive oil to prevent sticking.",
      "Place salmon skin-side down on the grill. Cook for 4-5 minutes.",
      "Carefully flip and cook for another 3-4 minutes until fish flakes easily.",
      "Remove from grill and let rest for 2 minutes.",
      "Serve with lemon wedges and your choice of side dishes."
    ],
    "hands-on-time": 20,
    nutrition: ["Calories: 280", "Protein: 35g", "Carbs: 0g", "Fat: 14g"],
    ingredients: [
      "4 salmon fillets (150g each)",
      "2 tbsp olive oil",
      "1 lemon, zested and cut into wedges",
      "Salt and pepper to taste",
      "Fresh dill for garnish"
    ],
    notes: [
      "Don't overcook - salmon should be slightly pink in the center.",
      "Grill marks add great flavor and presentation.",
      "Pair with roasted vegetables or a fresh salad."
    ],
    portions: 4,
    categorySlugs: ["seafood", "main-course"]
  },
  {
  id: 10,
    name: "French Onion Soup",
    photo: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=600&fit=crop",
    instructions: [
      "Slice onions thinly. Heat butter and oil in a large pot over medium-low heat.",
      "Add onions and cook slowly, stirring occasionally, for 30-40 minutes until caramelized.",
      "Add garlic and cook for 1 minute.",
      "Pour in wine and scrape up any browned bits. Simmer until reduced by half.",
      "Add beef broth and thyme. Bring to a boil, then reduce heat and simmer for 20 minutes.",
      "Season with salt and pepper.",
      "Ladle soup into oven-safe bowls. Top with bread and Gruyère cheese.",
      "Broil until cheese is melted and bubbly, about 2-3 minutes."
    ],
    "hands-on-time": 75,
    nutrition: ["Calories: 320", "Protein: 15g", "Carbs: 35g", "Fat: 12g"],
    ingredients: [
      "4 large yellow onions, thinly sliced",
      "3 tbsp butter",
      "1 tbsp olive oil",
      "2 cloves garlic, minced",
      "100ml dry white wine",
      "1 liter beef broth",
      "1 tsp fresh thyme",
      "4 slices French bread",
      "100g Gruyère cheese, grated",
      "Salt and pepper to taste"
    ],
    notes: [
      "Take your time caramelizing the onions - this is key to the flavor.",
      "Use a good quality beef broth for best results.",
      "The soup can be made ahead and reheated before serving."
    ],
    portions: 4,
    categorySlugs: ["french", "soup"]
  }
];

