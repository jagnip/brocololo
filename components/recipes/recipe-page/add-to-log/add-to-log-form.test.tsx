import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecipeAddToLogForm } from "./add-to-log-form";

describe("RecipeAddToLogForm", () => {
  it("shows guidance when there are no prefilled ingredient rows", () => {
    render(
      <RecipeAddToLogForm
        title="Add test recipe to log"
        subtitle="Dinner • 2026-04-21"
        initialRows={[]}
        ingredientOptions={[]}
        isSaving={false}
        onSave={async () => {}}
      />,
    );

    expect(
      screen.getByText(
        "No ingredients were prefilled for this recipe. You can add rows manually or save without ingredients.",
      ),
    ).toBeInTheDocument();
  });

  it("allows saving with zero ingredient rows", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});

    render(
      <RecipeAddToLogForm
        title="Add test recipe to log"
        subtitle="Dinner • 2026-04-21"
        initialRows={[]}
        ingredientOptions={[]}
        isSaving={false}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith([]);
  });
});
