import type { Meta, StoryObj } from "@storybook/react";
import RecipeCard from "./recipe-card";

const meta = {
  title: "Components/RecipeCard",
  component: RecipeCard,
} satisfies Meta<typeof RecipeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleRecipe = {
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
};

export const Default: Story = {
  args: {
    recipe: sampleRecipe,
    url: "/recipes/italian/classic-spaghetti-bolognese",
  },
};
