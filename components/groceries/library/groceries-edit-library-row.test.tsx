import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GroceriesEditLibraryRow } from "./groceries-edit-library-row";

describe("GroceriesEditLibraryRow", () => {
  const baseProps = {
    ingredientId: "ing-1",
    ingredientName: "Banana",
    ingredientDescriptor: null,
    onAddToGroceries: vi.fn(),
    onRemoveFromList: vi.fn(),
  };

  it("shows supermarket link next to ingredient name when URL exists", () => {
    render(
      <GroceriesEditLibraryRow
        {...baseProps}
        supermarketUrl="https://example.com/banana"
      />,
    );

    const link = screen.getByRole("link", { name: "Open Banana in supermarket" });
    expect(link).toHaveAttribute("href", "https://example.com/banana");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("hides supermarket link when URL is missing", () => {
    render(<GroceriesEditLibraryRow {...baseProps} supermarketUrl={null} />);

    expect(
      screen.queryByRole("link", { name: "Open Banana in supermarket" }),
    ).not.toBeInTheDocument();
  });
});
