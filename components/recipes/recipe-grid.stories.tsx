import type { Meta, StoryObj } from "@storybook/react";
import RecipeGrid from "./recipe-grid";
import { storyRecipes } from "@/lib/stories-data";

const meta = {
  title: "Components/RecipeGrid",
  component: RecipeGrid,
} satisfies Meta<typeof RecipeGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    recipes: storyRecipes,
    activeCategorySlug: "all",
  },
};
