import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GroceriesEditLibraryRow } from "./groceries-edit-library-row";

describe("GroceriesEditLibraryRow", () => {
  const baseProps = {
    ingredientId: "ing-1",
    ingredientSlug: "banana",
    ingredientName: "Banana",
    ingredientDescriptor: null,
    onAddToGroceries: vi.fn(),
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
});
