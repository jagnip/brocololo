import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlannerMealType } from "@/src/generated/enums";
import { PlannerSlotCard } from "./planner-slot-card";
import type { RecipeType } from "@/types/recipe";
import type { SlotInputType } from "@/types/planner";

vi.mock("next/image", () => ({
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

vi.mock("./plan-slot-meal-dialog", () => ({
  PlanSlotMealDialog: () => null,
}));

vi.mock("./slot-audience-select", () => ({
  SlotAudienceSelect: () => null,
}));

function createBatchRecipe(overrides: Partial<RecipeType> = {}): RecipeType {
  return {
    id: "r-bolognese",
    name: "Bolognese",
    slug: "bolognese",
    handsOnTime: 25,
    totalTime: 40,
    servings: 4,
    plannedMealCount: 2,
    isBatchRecipe: true,
    excludeFromPlanner: false,
    images: [],
    notes: [],
    instructions: [],
    ingredientGroups: [],
    ingredients: [],
    categories: [],
    audienceMembers: [],
    memberPortions: [],
    lastUsedInPlanner: null,
    ...overrides,
  } as RecipeType;
}

function createSlot(recipe: RecipeType): SlotInputType {
  return {
    date: new Date("2026-03-17T00:00:00.000Z"),
    mealType: PlannerMealType.DINNER,
    recipe,
    customMeal: null,
    alternatives: [],
    used: false,
    batchGroupId: "group-1",
  };
}

describe("PlannerSlotCard batch badge", () => {
  it("shows N of M when recipe is a batch recipe and a label is provided", () => {
    const recipe = createBatchRecipe();
    render(
      <PlannerSlotCard
        slot={createSlot(recipe)}
        batchLabel={{ index: 1, total: 2 }}
        recipes={[recipe]}
        ingredientOptions={[]}
      />,
    );

    expect(screen.getByLabelText("Meal 1 of 2")).toHaveTextContent("1 of 2");
  });

  it("hides the badge when the recipe is not marked as a batch recipe", () => {
    const recipe = createBatchRecipe({ isBatchRecipe: false });
    render(
      <PlannerSlotCard
        slot={createSlot(recipe)}
        batchLabel={{ index: 1, total: 2 }}
        recipes={[recipe]}
        ingredientOptions={[]}
      />,
    );

    expect(screen.queryByLabelText("Meal 1 of 2")).toBeNull();
  });

  it("hides the badge when no batch label is provided", () => {
    const recipe = createBatchRecipe();
    render(
      <PlannerSlotCard
        slot={createSlot(recipe)}
        recipes={[recipe]}
        ingredientOptions={[]}
      />,
    );

    expect(screen.queryByLabelText(/Meal \d+ of \d+/)).toBeNull();
  });

  it("uses recipeCookingHref for the title link when provided", () => {
    const recipe = createBatchRecipe();
    render(
      <PlannerSlotCard
        slot={createSlot(recipe)}
        recipeCookingHref="/recipes/bolognese?cook=abc%3A2"
        recipes={[recipe]}
        ingredientOptions={[]}
      />,
    );

    expect(screen.getByRole("link", { name: "Bolognese" })).toHaveAttribute(
      "href",
      "/recipes/bolognese?cook=abc%3A2",
    );
  });
});
