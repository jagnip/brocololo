import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adjustRollingMealAction, discardRollingMealQuantityAction } from "@/actions/rolling-meals-actions";
import { RollingMealsSection } from "./rolling-meals-section";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/actions/rolling-meals-actions", () => ({
  adjustRollingMealAction: vi.fn(),
  discardRollingMealQuantityAction: vi.fn(),
}));

const meals = [{ id: "entry", version: 2, kind: "recipe" as const, recipeId: "soup", name: "Soup", count: 5, unassignedCount: 2 }];

beforeEach(() => vi.resetAllMocks());

describe("RollingMealsSection", () => {
  it("renders an independent empty section", () => {
    render(<RollingMealsSection meals={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("No pending meals");
  });

  it("shows plan-only meals without storage actions", () => {
    render(<RollingMealsSection meals={[{ ...meals[0], unassignedCount: 0 }]} />);
    expect(screen.getByText("5 meals · 5 in plans · 0 unassigned")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("adjusts the queue entry with its version", async () => {
    const user = userEvent.setup();
    vi.mocked(adjustRollingMealAction).mockResolvedValue({ type: "success", entry: null });
    render(<RollingMealsSection meals={meals} />);
    expect(screen.getByText("5 meals · 3 in plans · 2 unassigned")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Adjust Soup" }));
    const dialog = screen.getByRole("dialog", { name: "Adjust Soup" });
    const input = within(dialog).getByRole("spinbutton", { name: "Unassigned meals" });
    expect(input).toHaveValue(2);
    await user.clear(input);
    await user.type(input, "3");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(adjustRollingMealAction).toHaveBeenCalledWith({ entryId: "entry", expectedVersion: 2, count: 3 });
    expect(refresh).toHaveBeenCalled();
  });

  it("discards only the selected quantity and reports conflicts", async () => {
    const user = userEvent.setup();
    vi.mocked(discardRollingMealQuantityAction).mockResolvedValue({ type: "conflict" });
    render(<RollingMealsSection meals={meals} />);
    await user.click(screen.getByRole("button", { name: "Discard Soup" }));
    const input = screen.getByRole("spinbutton", { name: "Unassigned meals" });
    expect(input).toHaveValue(2);
    await user.clear(input);
    await user.type(input, "3");
    expect(screen.getByRole("button", { name: "Discard meals" })).toBeDisabled();
    await user.clear(input);
    await user.type(input, "2");
    await user.click(screen.getByRole("button", { name: "Discard meals" }));
    expect(discardRollingMealQuantityAction).toHaveBeenCalledWith({ entryId: "entry", expectedVersion: 2, quantity: 2 });
    expect(await screen.findByRole("alert")).toHaveTextContent("changed elsewhere");
    expect(refresh).toHaveBeenCalled();
  });
});
