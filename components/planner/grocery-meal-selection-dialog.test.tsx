import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GroceryMealSelectionDialog } from "./grocery-meal-selection-dialog";

const meals = [
  { kind: "recipe" as const, recipeId: "chili", name: "Chili", occurrenceCount: 2 },
  { kind: "custom" as const, name: "Toast", occurrenceCount: 1 },
];

describe("GroceryMealSelectionDialog", () => {
  it("toggles selection by clicking the card's recipe name and disables cards during generation", async () => {
    const user = userEvent.setup();
    const props = { open: true, meals, isLoading: false, isGenerating: false, onConfirm: vi.fn(), onCancel: vi.fn() };
    const view = render(<GroceryMealSelectionDialog {...props} />);
    const checkbox = screen.getByRole("checkbox", { name: "Chili \u00b7 2 meals" });
    expect(checkbox).toBeChecked();
    await user.click(screen.getByText("Chili"));
    expect(checkbox).not.toBeChecked();
    await user.click(screen.getByText("Chili"));
    expect(checkbox).toBeChecked();
    view.rerender(<GroceryMealSelectionDialog {...props} isGenerating />);
    expect(checkbox).toBeDisabled();
    expect(screen.getByRole("button", { name: /Generating/ })).toBeDisabled();
  });

  it("shows planned and storage counts separately, omitting zero storage", () => {
    render(<GroceryMealSelectionDialog
      open
      meals={[
        { kind: "recipe", recipeId: "chili", name: "Chili", occurrenceCount: 5, storageCount: 5 },
        { kind: "recipe", recipeId: "chili", name: "Chili", occurrenceCount: 1, alreadyAvailable: true, alreadyCooked: true },
      ]}
      isLoading={false} isGenerating={false}
      onConfirm={vi.fn()} onCancel={vi.fn()}
    />);
    expect(screen.getByRole("checkbox", { name: "Chili \u00b7 5 meals \u00b7 5 in storage" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Chili \u00b7 1 meal \u00b7 Already cooked" })).not.toBeChecked();
    expect(screen.queryByText(/planned/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0 in storage/)).not.toBeInTheDocument();
  });

  it.each([
    [true, "Already cooked"],
    [false, "Rolled over"],
  ] as const)("shows only one available status (cooked: %s)", (alreadyCooked, status) => {
    render(<GroceryMealSelectionDialog
      open
      meals={[{ kind: "recipe", recipeId: "chili", name: "Chili", occurrenceCount: 2, alreadyAvailable: true, alreadyCooked }]}
      isLoading={false} isGenerating={false}
      onConfirm={vi.fn()} onCancel={vi.fn()}
    />);
    expect(screen.getByRole("checkbox", { name: `Chili \u00b7 2 meals \u00b7 ${status}` })).not.toBeChecked();
    if (alreadyCooked) {
      expect(screen.queryByText(/Rolled over/)).not.toBeInTheDocument();
    }
    expect(screen.queryByRole("checkbox", { name: /Rolled over \/ Already cooked/ })).not.toBeInTheDocument();
  });

  it("explains an empty plan and prevents generation", () => {
    const onConfirm = vi.fn();
    render(<GroceryMealSelectionDialog
      open meals={[]} isLoading={false} isGenerating={false}
      onConfirm={onConfirm} onCancel={vi.fn()}
    />);

    expect(screen.getByText(/No ingredients to buy/)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Generate list" }));
    expect(screen.getByRole("button", { name: "Generate list" })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("explains automatic exclusions while preserving recipe deselection", () => {
    const onConfirm = vi.fn();
    render(<GroceryMealSelectionDialog
      open meals={meals} isLoading={false} isGenerating={false}
      onConfirm={onConfirm} onCancel={vi.fn()}
    />);

    expect(screen.queryByText(/Checked meals will be included/)).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Chili \u00b7 2 meals" })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "Chili \u00b7 2 meals" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate list" }));
    expect(onConfirm).toHaveBeenCalledWith({
      excludedRecipeIds: ["chili"],
      excludedCustomMealKeys: [],
    });
  });

  it("starts available recipes unchecked and lets users opt them in", () => {
    const onConfirm = vi.fn();
    render(<GroceryMealSelectionDialog
      open
      meals={[{ kind: "recipe", recipeId: "chili", name: "Chili", occurrenceCount: 2, alreadyAvailable: true }]}
      isLoading={false} isGenerating={false}
      onConfirm={onConfirm} onCancel={vi.fn()}
    />);
    const option = screen.getByRole("checkbox", { name: /Chili/ });
    expect(option).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Generate list" })).toBeDisabled();
    fireEvent.click(option);
    fireEvent.click(screen.getByRole("button", { name: "Generate list" }));
    expect(onConfirm).toHaveBeenCalledWith({
      excludedRecipeIds: [], excludedCustomMealKeys: [], includedAvailableRecipeIds: ["chili"],
    });
  });

  it("does not show the empty explanation while loading", () => {
    render(<GroceryMealSelectionDialog
      open meals={[]} isLoading isGenerating={false}
      onConfirm={vi.fn()} onCancel={vi.fn()}
    />);

    expect(screen.getByText(/Loading meals/)).toBeInTheDocument();
    expect(screen.queryByText(/No ingredients to buy/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate list" })).toBeDisabled();
  });
});
