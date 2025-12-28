import type { Meta, StoryObj } from "@storybook/react";
import RecipeCard from "./recipe-card";
import { storyRecipes } from "@/lib/stories-data";

const meta = {
  title: "Components/RecipeCard",
  component: RecipeCard,
} satisfies Meta<typeof RecipeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    recipe: storyRecipes[0],
  },
};
