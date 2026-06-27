import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GroceriesEditLibraryRow } from "./groceries-edit-library-row";

describe("GroceriesEditLibraryRow", () => {
  const baseProps = {
    ingredientId: "ing-1",
    ingredientSlug: "banana",
    ingredientName: "Banana",
    ingredientDescriptor: null,
    onAddToGroceries: vi.fn(),
    onEditIngredientRequested: vi.fn(),
    onRemoveFromList: vi.fn(),
  };

  it("links ingredient name to the ingredient edit page", () => {
    render(<GroceriesEditLibraryRow {...baseProps} />);

    const link = screen.getByRole("link", { name: "Banana" });
    expect(link).toHaveAttribute("href", "/ingredients/banana/edit");
  });

  it("does not show a supermarket external-link icon", () => {
    render(<GroceriesEditLibraryRow {...baseProps} />);

    expect(
      screen.queryByRole("link", { name: "Open Banana in supermarket" }),
    ).not.toBeInTheDocument();
  });

  it("opens overflow menu with edit and remove actions", async () => {
    const user = userEvent.setup();
    render(<GroceriesEditLibraryRow {...baseProps} />);

    await user.click(screen.getByRole("button", { name: "Actions for Banana" }));

    expect(screen.getByRole("menuitem", { name: "Edit ingredient" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Remove from list" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove Banana from list" }),
    ).not.toBeInTheDocument();
  });

  it("fires edit and remove callbacks from the overflow menu", async () => {
    const user = userEvent.setup();
    const onEditIngredientRequested = vi.fn();
    const onRemoveFromList = vi.fn();

    render(
      <GroceriesEditLibraryRow
        {...baseProps}
        onEditIngredientRequested={onEditIngredientRequested}
        onRemoveFromList={onRemoveFromList}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Actions for Banana" }));
    await user.click(screen.getByRole("menuitem", { name: "Edit ingredient" }));
    expect(onEditIngredientRequested).toHaveBeenCalledWith("ing-1");

    await user.click(screen.getByRole("button", { name: "Actions for Banana" }));
    await user.click(screen.getByRole("menuitem", { name: "Remove from list" }));
    expect(onRemoveFromList).toHaveBeenCalledWith("ing-1");
  });
});
