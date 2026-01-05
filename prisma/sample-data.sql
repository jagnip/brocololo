-- Seed data for Categories and Recipes
-- Categories: Dinner, Breakfast, Snacks
-- 5 recipes per category

-- Insert Categories
INSERT INTO categories (id, name, slug) VALUES
('cat_dinner_001', 'Dinner', 'dinner'),
('cat_breakfast_001', 'Breakfast', 'breakfast'),
('cat_snacks_001', 'Snacks', 'snacks');

-- Insert Dinner Recipes
INSERT INTO recipes (id, name, slug, photo, instructions, hands_on_time, nutrition, ingredients, notes, portions, "createdAt") VALUES
('rec_dinner_001', 'Grilled Salmon with Vegetables', 'grilled-salmon-vegetables', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&h=600&fit=crop', 
 ARRAY[
   'Preheat grill to medium-high heat. Clean and oil the grill grates.',
   'Pat salmon fillets dry and season both sides with salt, pepper, and lemon zest.',
   'Brush fillets with olive oil to prevent sticking.',
   'Place salmon skin-side down on the grill. Cook for 4-5 minutes.',
   'Carefully flip and cook for another 3-4 minutes until fish flakes easily.',
   'Remove from grill and let rest for 2 minutes.',
   'Serve with roasted vegetables and lemon wedges.'
 ], 
 25,
 ARRAY['Calories: 320', 'Protein: 35g', 'Carbs: 5g', 'Fat: 16g'],
 ARRAY[
   '4 salmon fillets (150g each)',
   '2 tbsp olive oil',
   '1 lemon, zested and cut into wedges',
   '500g mixed vegetables (zucchini, bell peppers, asparagus)',
   'Salt and pepper to taste',
   'Fresh dill for garnish'
 ],
 ARRAY[
   'Don''t overcook - salmon should be slightly pink in the center.',
   'Grill marks add great flavor and presentation.',
   'Pair with roasted vegetables or a fresh salad.'
 ],
 4,
 NOW()),

('rec_dinner_002', 'Beef Stir Fry', 'beef-stir-fry', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&h=600&fit=crop',
 ARRAY[
   'Cut beef into thin strips and marinate in soy sauce and cornstarch for 15 minutes.',
   'Heat a wok or large pan over high heat. Add oil and swirl to coat.',
   'Add garlic and ginger, stir-fry for 30 seconds until fragrant.',
   'Add beef and cook for 2-3 minutes until browned. Remove and set aside.',
   'Add vegetables to the pan and stir-fry for 3-4 minutes until crisp-tender.',
   'Return beef to the pan, add sauce, and toss everything together.',
   'Serve immediately over steamed rice.'
 ],
 30,
 ARRAY['Calories: 380', 'Protein: 32g', 'Carbs: 25g', 'Fat: 18g'],
 ARRAY[
   '500g beef sirloin, sliced',
   '2 bell peppers, sliced',
   '200g broccoli florets',
   '2 carrots, julienned',
   '3 cloves garlic, minced',
   '1 tbsp fresh ginger, grated',
   '3 tbsp soy sauce',
   '1 tbsp sesame oil',
   '2 tbsp vegetable oil'
 ],
 ARRAY[
   'Keep the heat high for the best stir-fry texture.',
   'Prepare all ingredients before starting to cook.',
   'Don''t overcrowd the pan - cook in batches if needed.'
 ],
 4,
 NOW()),

('rec_dinner_003', 'Chicken Parmesan', 'chicken-parmesan', 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800&h=600&fit=crop',
 ARRAY[
   'Preheat oven to 200°C (400°F).',
   'Pound chicken breasts to even thickness, about 1cm thick.',
   'Season chicken with salt and pepper.',
   'Dredge chicken in flour, then egg, then breadcrumb mixture.',
   'Heat oil in a large oven-safe skillet over medium-high heat.',
   'Cook chicken for 3-4 minutes per side until golden.',
   'Top with marinara sauce and mozzarella cheese.',
   'Transfer to oven and bake for 15-20 minutes until cheese is bubbly.',
   'Garnish with fresh basil and serve over pasta.'
 ],
 45,
 ARRAY['Calories: 520', 'Protein: 38g', 'Carbs: 35g', 'Fat: 22g'],
 ARRAY[
   '4 chicken breasts',
   '200g breadcrumbs',
   '100g Parmesan cheese, grated',
   '200g mozzarella cheese, sliced',
   '400ml marinara sauce',
   '2 eggs, beaten',
   '100g all-purpose flour',
   '3 tbsp olive oil',
   'Fresh basil for garnish'
 ],
 ARRAY[
   'Pound chicken to even thickness for consistent cooking.',
   'Use a good quality marinara sauce for best flavor.',
   'Serve immediately while cheese is still bubbly.'
 ],
 4,
 NOW()),

('rec_dinner_004', 'Vegetarian Lasagna', 'vegetarian-lasagna', 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&h=600&fit=crop',
 ARRAY[
   'Preheat oven to 180°C (350°F).',
   'Cook lasagna noodles according to package directions until al dente.',
   'In a large pan, sauté onions and garlic until soft.',
   'Add mushrooms, zucchini, and spinach. Cook until vegetables are tender.',
   'Mix ricotta cheese with egg, salt, and pepper.',
   'Layer: sauce, noodles, ricotta mixture, vegetables, mozzarella. Repeat.',
   'Top with remaining sauce and Parmesan cheese.',
   'Cover with foil and bake for 45 minutes.',
   'Remove foil and bake for another 15 minutes until golden.',
   'Let rest for 10 minutes before serving.'
 ],
 60,
 ARRAY['Calories: 420', 'Protein: 22g', 'Carbs: 45g', 'Fat: 18g'],
 ARRAY[
   '12 lasagna noodles',
   '500g ricotta cheese',
   '300g mozzarella cheese, shredded',
   '100g Parmesan cheese, grated',
   '400ml marinara sauce',
   '200g mushrooms, sliced',
   '2 zucchinis, sliced',
   '200g spinach, chopped',
   '1 large onion, diced',
   '3 cloves garlic, minced',
   '1 egg',
   '2 tbsp olive oil'
 ],
 ARRAY[
   'Let lasagna rest before cutting for cleaner slices.',
   'Can be made ahead and refrigerated before baking.',
   'Freeze leftovers for up to 3 months.'
 ],
 6,
 NOW()),

('rec_dinner_005', 'Pork Tenderloin with Apple Sauce', 'pork-tenderloin-apple-sauce', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop',
 ARRAY[
   'Preheat oven to 200°C (400°F).',
   'Season pork tenderloin with salt, pepper, and herbs.',
   'Heat oil in an oven-safe skillet over medium-high heat.',
   'Sear pork on all sides until golden, about 2 minutes per side.',
   'Transfer skillet to oven and roast for 15-20 minutes until internal temperature reaches 63°C (145°F).',
   'Remove from oven and let rest for 5 minutes.',
   'Meanwhile, make apple sauce by cooking apples with butter, sugar, and cinnamon.',
   'Slice pork and serve with apple sauce and roasted potatoes.'
 ],
 40,
 ARRAY['Calories: 350', 'Protein: 30g', 'Carbs: 20g', 'Fat: 16g'],
 ARRAY[
   '600g pork tenderloin',
   '3 apples, peeled and diced',
   '2 tbsp butter',
   '1 tbsp brown sugar',
   '1/2 tsp cinnamon',
   '2 tbsp olive oil',
   'Salt and pepper to taste',
   'Fresh thyme'
 ],
 ARRAY[
   'Use a meat thermometer for perfect doneness.',
   'Let pork rest before slicing to retain juices.',
   'Apple sauce can be made ahead and reheated.'
 ],
 4,
 NOW());

-- Insert Breakfast Recipes
INSERT INTO recipes (id, name, slug, photo, instructions, hands_on_time, nutrition, ingredients, notes, portions, "createdAt") VALUES
('rec_breakfast_001', 'Classic Pancakes', 'classic-pancakes', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop',
 ARRAY[
   'In a large bowl, whisk together flour, sugar, baking powder, and salt.',
   'In another bowl, beat eggs, then add milk, melted butter, and vanilla.',
   'Pour wet ingredients into dry ingredients and stir until just combined. Don''t overmix.',
   'Heat a griddle or large pan over medium heat. Lightly grease with butter.',
   'Pour 1/4 cup batter for each pancake onto the griddle.',
   'Cook until bubbles form on the surface, then flip and cook until golden.',
   'Serve hot with maple syrup and butter.'
 ],
 20,
 ARRAY['Calories: 180', 'Protein: 5g', 'Carbs: 28g', 'Fat: 6g'],
 ARRAY[
   '200g all-purpose flour',
   '2 tbsp sugar',
   '2 tsp baking powder',
   '1/2 tsp salt',
   '2 large eggs',
   '300ml milk',
   '3 tbsp butter, melted',
   '1 tsp vanilla extract',
   'Butter and maple syrup for serving'
 ],
 ARRAY[
   'Don''t overmix the batter - lumps are okay.',
   'Let the griddle heat up before adding batter.',
   'Keep cooked pancakes warm in a low oven.'
 ],
 8,
 NOW()),

('rec_breakfast_002', 'Avocado Toast with Eggs', 'avocado-toast-eggs', 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800&h=600&fit=crop',
 ARRAY[
   'Toast bread slices until golden and crispy.',
   'Mash avocado with lemon juice, salt, and pepper.',
   'Spread avocado mixture on toast.',
   'Heat a non-stick pan over medium heat.',
   'Crack eggs into the pan and cook to your preference (fried or poached).',
   'Place eggs on top of avocado toast.',
   'Garnish with red pepper flakes, microgreens, or everything bagel seasoning.',
   'Serve immediately.'
 ],
 10,
 ARRAY['Calories: 280', 'Protein: 12g', 'Carbs: 22g', 'Fat: 18g'],
 ARRAY[
   '4 slices sourdough bread',
   '2 ripe avocados',
   '4 eggs',
   '1 lemon, juiced',
   'Salt and pepper to taste',
   'Red pepper flakes (optional)',
   'Microgreens or fresh herbs (optional)'
 ],
 ARRAY[
   'Use ripe avocados for best flavor and texture.',
   'Add a squeeze of lemon to prevent browning.',
   'Customize with your favorite toppings like tomatoes or feta cheese.'
 ],
 4,
 NOW()),

('rec_breakfast_003', 'French Toast', 'french-toast', 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&h=600&fit=crop',
 ARRAY[
   'In a shallow dish, whisk together eggs, milk, vanilla, cinnamon, and a pinch of salt.',
   'Heat butter in a large skillet over medium heat.',
   'Dip each bread slice into the egg mixture, coating both sides.',
   'Let excess mixture drip off, then place in the skillet.',
   'Cook for 3-4 minutes per side until golden brown.',
   'Repeat with remaining slices, adding more butter as needed.',
   'Serve hot with maple syrup, fresh berries, and powdered sugar.'
 ],
 15,
 ARRAY['Calories: 220', 'Protein: 8g', 'Carbs: 28g', 'Fat: 8g'],
 ARRAY[
   '8 slices thick bread (brioche or challah work best)',
   '4 large eggs',
   '200ml milk',
   '1 tsp vanilla extract',
   '1/2 tsp cinnamon',
   '2 tbsp butter',
   'Maple syrup for serving',
   'Fresh berries (optional)'
 ],
 ARRAY[
   'Use day-old bread for best results.',
   'Don''t soak the bread too long or it will become soggy.',
   'Keep cooked slices warm in a low oven while cooking the rest.'
 ],
 4,
 NOW()),

('rec_breakfast_004', 'Scrambled Eggs with Smoked Salmon', 'scrambled-eggs-smoked-salmon', 'https://images.unsplash.com/photo-1588168333984-ff9c8b3c11b1?w=800&h=600&fit=crop',
 ARRAY[
   'Crack eggs into a bowl and whisk with a splash of milk or cream.',
   'Season with salt and pepper.',
   'Heat butter in a non-stick pan over medium-low heat.',
   'Pour in eggs and gently stir with a spatula.',
   'Cook slowly, stirring occasionally, until eggs are creamy and just set.',
   'Remove from heat while still slightly runny (they''ll continue cooking).',
   'Serve on toast, top with smoked salmon, and garnish with chives and capers.'
 ],
 10,
 ARRAY['Calories: 320', 'Protein: 20g', 'Carbs: 15g', 'Fat: 20g'],
 ARRAY[
   '6 large eggs',
   '2 tbsp butter',
   '2 tbsp milk or cream',
   '100g smoked salmon',
   '4 slices bread, toasted',
   'Fresh chives, chopped',
   '1 tbsp capers',
   'Salt and pepper to taste'
 ],
 ARRAY[
   'Cook eggs slowly over low heat for the creamiest texture.',
   'Remove from heat just before fully cooked.',
   'Smoked salmon adds a luxurious touch to simple scrambled eggs.'
 ],
 4,
 NOW()),

('rec_breakfast_005', 'Overnight Oats', 'overnight-oats', 'https://images.unsplash.com/photo-1575925510742-0d93b13c0c4a?w=800&h=600&fit=crop',
 ARRAY[
   'In a jar or bowl, combine rolled oats, milk, and yogurt.',
   'Add chia seeds, honey or maple syrup, and vanilla extract.',
   'Stir everything together until well combined.',
   'Cover and refrigerate overnight (at least 6 hours).',
   'In the morning, stir the oats and add your favorite toppings.',
   'Serve cold or at room temperature.'
 ],
 5,
 ARRAY['Calories: 280', 'Protein: 12g', 'Carbs: 45g', 'Fat: 8g'],
 ARRAY[
   '100g rolled oats',
   '200ml milk (or plant-based milk)',
   '100g Greek yogurt',
   '1 tbsp chia seeds',
   '1 tbsp honey or maple syrup',
   '1/2 tsp vanilla extract',
   'Fresh berries, banana, or nuts for topping'
 ],
 ARRAY[
   'Make multiple jars at once for meal prep.',
   'Can be stored in the fridge for up to 5 days.',
   'Customize with your favorite fruits and nuts.'
 ],
 2,
 NOW());

-- Insert Snacks Recipes
INSERT INTO recipes (id, name, slug, photo, instructions, hands_on_time, nutrition, ingredients, notes, portions, "createdAt") VALUES
('rec_snacks_001', 'Homemade Hummus', 'homemade-hummus', 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&h=600&fit=crop',
 ARRAY[
   'Drain and rinse chickpeas. Reserve some liquid.',
   'In a food processor, combine chickpeas, tahini, lemon juice, and garlic.',
   'Process until smooth, adding reserved chickpea liquid as needed.',
   'With processor running, slowly drizzle in olive oil.',
   'Season with salt and cumin.',
   'Process until creamy and smooth.',
   'Transfer to a bowl, drizzle with olive oil, and garnish with paprika.',
   'Serve with pita bread, vegetables, or crackers.'
 ],
 15,
 ARRAY['Calories: 150', 'Protein: 6g', 'Carbs: 15g', 'Fat: 8g'],
 ARRAY[
   '400g canned chickpeas, drained',
   '3 tbsp tahini',
   '2 tbsp lemon juice',
   '2 cloves garlic, minced',
   '3 tbsp olive oil',
   '1/2 tsp salt',
   '1/2 tsp cumin',
   'Paprika for garnish'
 ],
 ARRAY[
   'Save the chickpea liquid (aquafaba) for thinning the hummus.',
   'Adjust lemon and garlic to your taste preference.',
   'Store in an airtight container in the fridge for up to 5 days.'
 ],
 6,
 NOW()),

('rec_snacks_002', 'Trail Mix', 'trail-mix', 'https://images.unsplash.com/photo-1606312619070-d48b4e001cb5?w=800&h=600&fit=crop',
 ARRAY[
   'Preheat oven to 150°C (300°F) if toasting nuts.',
   'Spread nuts on a baking sheet and toast for 10 minutes until fragrant. Let cool.',
   'In a large bowl, combine all nuts, seeds, and dried fruits.',
   'Add chocolate chips or M&Ms if desired.',
   'Mix everything together until well combined.',
   'Store in an airtight container at room temperature.'
 ],
 10,
 ARRAY['Calories: 200', 'Protein: 6g', 'Carbs: 18g', 'Fat: 14g'],
 ARRAY[
   '100g almonds',
   '100g cashews',
   '100g walnuts',
   '50g pumpkin seeds',
   '50g sunflower seeds',
   '100g dried cranberries',
   '100g raisins',
   '50g dark chocolate chips (optional)'
 ],
 ARRAY[
   'Customize with your favorite nuts and dried fruits.',
   'Toasting nuts enhances their flavor.',
   'Great for on-the-go snacking or hiking.'
 ],
 10,
 NOW()),

('rec_snacks_003', 'Guacamole', 'guacamole', 'https://images.unsplash.com/photo-1588167377665-3c9b8b1b0b5e?w=800&h=600&fit=crop',
 ARRAY[
   'Cut avocados in half, remove pits, and scoop flesh into a bowl.',
   'Mash avocados with a fork to your desired consistency (chunky or smooth).',
   'Add lime juice, diced onion, tomatoes, and cilantro.',
   'Season with salt and pepper.',
   'Add minced jalapeño if you like it spicy.',
   'Mix gently to combine.',
   'Serve immediately with tortilla chips or as a topping.'
 ],
 10,
 ARRAY['Calories: 120', 'Protein: 2g', 'Carbs: 8g', 'Fat: 10g'],
 ARRAY[
   '3 ripe avocados',
   '1 lime, juiced',
   '1/2 small red onion, diced',
   '1 tomato, diced',
   '2 tbsp fresh cilantro, chopped',
   '1 jalapeño, minced (optional)',
   'Salt and pepper to taste',
   'Tortilla chips for serving'
 ],
 ARRAY[
   'Use ripe avocados for best flavor.',
   'Add lime juice immediately to prevent browning.',
   'Best served fresh, but can be stored with plastic wrap touching the surface.'
 ],
 6,
 NOW()),

('rec_snacks_004', 'Energy Balls', 'energy-balls', 'https://images.unsplash.com/photo-1606312619070-d48b4e001cb5?w=800&h=600&fit=crop',
 ARRAY[
   'In a food processor, combine dates, almonds, and cocoa powder.',
   'Process until mixture forms a sticky paste.',
   'Add coconut, chia seeds, and vanilla extract.',
   'Process until well combined and mixture holds together when pressed.',
   'Form into small balls using your hands.',
   'Roll in additional coconut or cocoa powder if desired.',
   'Refrigerate for at least 30 minutes before serving.',
   'Store in an airtight container in the fridge.'
 ],
 20,
 ARRAY['Calories: 90', 'Protein: 2g', 'Carbs: 12g', 'Fat: 5g'],
 ARRAY[
   '200g pitted dates',
   '100g almonds',
   '2 tbsp cocoa powder',
   '50g shredded coconut',
   '1 tbsp chia seeds',
   '1/2 tsp vanilla extract',
   'Pinch of salt'
 ],
 ARRAY[
   'If mixture is too dry, add a splash of water or more dates.',
   'If too wet, add more almonds or coconut.',
   'Can be stored in the fridge for up to 2 weeks.'
 ],
 20,
 NOW()),

('rec_snacks_005', 'Veggie Sticks with Dip', 'veggie-sticks-dip', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop',
 ARRAY[
   'Wash and cut vegetables into sticks: carrots, celery, bell peppers, and cucumbers.',
   'For the dip, combine Greek yogurt, lemon juice, and herbs.',
   'Season with salt, pepper, and garlic powder.',
   'Mix until well combined.',
   'Arrange vegetable sticks on a platter.',
   'Serve with the dip on the side.',
   'Can be prepared ahead and stored in the fridge.'
 ],
 15,
 ARRAY['Calories: 60', 'Protein: 3g', 'Carbs: 8g', 'Fat: 2g'],
 ARRAY[
   '4 carrots, cut into sticks',
   '4 celery stalks, cut into sticks',
   '2 bell peppers, cut into strips',
   '1 cucumber, cut into sticks',
   '200g Greek yogurt',
   '1 tbsp lemon juice',
   '1 tsp dried dill or fresh herbs',
   '1/2 tsp garlic powder',
   'Salt and pepper to taste'
 ],
 ARRAY[
   'Cut vegetables into uniform sizes for even presentation.',
   'The dip can be customized with different herbs and spices.',
   'A healthy and refreshing snack option.'
 ],
 4,
 NOW());

-- Create join table relationships (Prisma implicit many-to-many creates _CategoryToRecipe table)
-- Link Dinner recipes to Dinner category
INSERT INTO "_CategoryToRecipe" ("A", "B") VALUES
('cat_dinner_001', 'rec_dinner_001'),
('cat_dinner_001', 'rec_dinner_002'),
('cat_dinner_001', 'rec_dinner_003'),
('cat_dinner_001', 'rec_dinner_004'),
('cat_dinner_001', 'rec_dinner_005');

-- Link Breakfast recipes to Breakfast category
INSERT INTO "_CategoryToRecipe" ("A", "B") VALUES
('cat_breakfast_001', 'rec_breakfast_001'),
('cat_breakfast_001', 'rec_breakfast_002'),
('cat_breakfast_001', 'rec_breakfast_003'),
('cat_breakfast_001', 'rec_breakfast_004'),
('cat_breakfast_001', 'rec_breakfast_005');

-- Link Snacks recipes to Snacks category
INSERT INTO "_CategoryToRecipe" ("A", "B") VALUES
('cat_snacks_001', 'rec_snacks_001'),
('cat_snacks_001', 'rec_snacks_002'),
('cat_snacks_001', 'rec_snacks_003'),
('cat_snacks_001', 'rec_snacks_004'),
('cat_snacks_001', 'rec_snacks_005');

