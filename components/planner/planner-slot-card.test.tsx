import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlannerMealType } from "@/src/generated/enums";
import { PlannerSlotCard } from "./planner-slot-card";
import type { RecipeType } from "@/types/recipe";
import type { SlotInputType } from "@/types/planner";

vi.mock("next/image", () => ({
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

vi.mock("./plan-slot-meal-dialog", () => ({
  PlanSlotMealDialog: ({ open }: { open: boolean }) => open ? <div role="dialog">Meal editor</div> : null,
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
  it.each(["recipe", "custom", "empty"])("selects the %s card body without intercepting controls", (kind) => {
    const recipe = createBatchRecipe();
    const slot = createSlot(recipe);
    if (kind !== "recipe") slot.recipe = null;
    if (kind === "custom") slot.customMeal = { name: "Custom dinner", ingredients: [] };
    const onCardSelect = vi.fn();
    const onSelectionChange = vi.fn();
    const onRemove = vi.fn();
    const { container } = render(
      <PlannerSlotCard
        slot={slot}
        onCardSelect={onCardSelect}
        onSelectionChange={onSelectionChange}
        onSetMeal={vi.fn()}
        onRemove={onRemove}
        recipes={[recipe]}
        ingredientOptions={[]}
      />,
    );
    const card = container.querySelector("[data-planner-selection-card]")!;
    fireEvent.click(card, { shiftKey: true });
    expect(onCardSelect).toHaveBeenCalledWith({ shiftKey: true, metaKey: false, ctrlKey: false });
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onSelectionChange).toHaveBeenCalledWith(true);
    expect(onCardSelect).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: kind === "empty" ? /Add meal/ : "Edit meal" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Meal editor");
    expect(onCardSelect).toHaveBeenCalledTimes(1);
  });

  it("shows Batch · N of M when recipe is a batch recipe and a label is provided", () => {
    const recipe = createBatchRecipe();
    render(
      <PlannerSlotCard
        slot={createSlot(recipe)}
        batchLabel={{ index: 1, total: 2 }}
        recipes={[recipe]}
        ingredientOptions={[]}
      />,
    );

    expect(screen.getByLabelText("Batch meal 1 of 2")).toHaveTextContent(
      "Batch · 1 of 2",
    );
  });

  it("always shows 1 of X even when the live group index is higher", () => {
    const recipe = createBatchRecipe();
    render(
      <PlannerSlotCard
        slot={createSlot(recipe)}
        batchLabel={{ index: 2, total: 4 }}
        recipes={[recipe]}
        ingredientOptions={[]}
      />,
    );

    expect(screen.getByLabelText("Batch meal 1 of 4")).toHaveTextContent(
      "Batch · 1 of 4",
    );
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

    expect(screen.queryByLabelText("Batch meal 1 of 2")).toBeNull();
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

    expect(screen.queryByLabelText(/Batch meal \d+ of \d+/)).toBeNull();
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
