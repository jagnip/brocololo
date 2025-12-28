import type { Meta, StoryObj } from "@storybook/react";
import RecipeDialog from "./recipe-dialog";
import { storyRecipes } from "@/lib/stories-data";

const meta = {
  title: "Components/RecipeDialog",
  component: RecipeDialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof RecipeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    recipe: storyRecipes[0].slug,
  },
};
