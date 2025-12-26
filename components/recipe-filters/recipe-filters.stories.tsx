import type { Meta, StoryObj } from "@storybook/react";
import RecipeFilters from "./recipe-filters";
import { categoriesData } from "@/lib/categories-data";

const meta = {
  title: "Components/RecipeFilters",
  component: RecipeFilters,
} satisfies Meta<typeof RecipeFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    categories: categoriesData,
    activeCategorySlug: "all",
  },
};

