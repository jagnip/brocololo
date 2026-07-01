import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useIsLg } from "@/hooks/use-is-lg";
import { GroceriesEditLibraryShell } from "./groceries-edit-library-shell";

vi.mock("@/hooks/use-is-lg", () => ({
  useIsLg: vi.fn(() => false),
}));

const baseProps = {
  collapsed: false,
  onCollapsedChange: vi.fn(),
  planId: "plan-1",
  lists: [],
  ingredients: [],
  categories: [],
  onAddIngredientToGroceries: vi.fn(),
  onEditIngredientRequested: vi.fn(),
};

describe("GroceriesEditLibraryShell", () => {
  it("renders accordion header collapsed by default below lg", () => {
    render(<GroceriesEditLibraryShell {...baseProps} />);

    expect(screen.getByRole("heading", { name: "Lists" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand lists" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: "Create new list" })).toBeInTheDocument();
    expect(screen.queryByText("No lists yet")).not.toBeInTheDocument();
  });

  it("expands accordion content when the outlined chevron is clicked", async () => {
    const user = userEvent.setup();
    render(<GroceriesEditLibraryShell {...baseProps} />);

    await user.click(screen.getByRole("button", { name: "Expand lists" }));

    expect(screen.getByRole("button", { name: "Collapse lists" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("No lists yet")).toBeInTheDocument();
  });

  it("renders outlined chevron beside Lists in the sidebar on lg+", async () => {
    vi.mocked(useIsLg).mockReturnValue(true);
    const onCollapsedChange = vi.fn();
    const user = userEvent.setup();

    render(
      <GroceriesEditLibraryShell
        {...baseProps}
        onCollapsedChange={onCollapsedChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Collapse lists" }));

    expect(onCollapsedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("heading", { name: "Lists" })).toBeInTheDocument();
  });
});
