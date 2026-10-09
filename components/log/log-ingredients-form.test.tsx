import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LogIngredientsForm } from "./log-ingredients-form";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Cmdk uses browser APIs that jsdom does not implement.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock;
}
if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {};
}
if (!HTMLElement.prototype.scrollTo) {
  HTMLElement.prototype.scrollTo = () => {};
}

describe("LogIngredientsForm", () => {
  it.each(["pointer", "keyboard"])(
    "focuses the selected row's amount after %s ingredient selection",
    async (selection) => {
      const user = userEvent.setup();
      render(
        <LogIngredientsForm
          title="Snack"
          subtitle=""
          initialRows={[]}
          ingredientOptions={[
            {
              id: "oats",
              name: "Oats",
              brand: null,
              defaultUnitId: "g",
              calories: 380,
              proteins: 13,
              fats: 7,
              carbs: 68,
              unitConversions: [
                {
                  unitId: "g",
                  gramsPerUnit: 1,
                  unitName: "g",
                  unitNamePlural: null,
                },
              ],
            },
          ]}
          isSaving={false}
          recipeOptions={[]}
          selectedRecipeId={null}
          initialSelectedRecipeId={null}
          onSelectedRecipeIdChange={vi.fn()}
          onSave={vi.fn()}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Add ingredient" }));
      await user.click(screen.getByRole("button", { name: "Add ingredient" }));
      const inputs = screen.getAllByRole("spinbutton");
      expect(inputs[1]).not.toHaveFocus();
      await user.click(screen.getAllByText("Select ingredient...")[1]!);
      await user.type(screen.getByPlaceholderText("Search ingredient..."), "Oats");

      if (selection === "keyboard") {
        await user.keyboard("{Enter}");
      } else {
        await user.click(screen.getByText("Oats"));
      }

      await waitFor(() => expect(inputs[1]).toHaveFocus());
      await user.keyboard("75");
      expect(inputs[1]).toHaveValue(75);
      expect(inputs[0]).toHaveValue(null);
      expect(
        screen.queryByPlaceholderText("Search ingredient..."),
      ).not.toBeInTheDocument();
    },
  );
});
