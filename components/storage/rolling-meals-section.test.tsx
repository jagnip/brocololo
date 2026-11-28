import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adjustRollingMealAction, stopRollingMealsAction } from "@/actions/rolling-meals-actions";
import { RollingMealsSection } from "./rolling-meals-section";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/actions/rolling-meals-actions", () => ({ adjustRollingMealAction: vi.fn(), stopRollingMealsAction: vi.fn() }));

const meal = { id: "entry", version: 2, kind: "recipe" as const, recipeId: "soup", name: "Soup", count: 2, unassignedCount: 0, unitIds: ["one", "two"] };
const meals = { latestPlan: { id: "plan", startDate: new Date("2026-11-23"), endDate: new Date("2026-11-29") }, latest: [meal], earlier: [], unscheduled: [] };

beforeEach(() => vi.resetAllMocks());

describe("RollingMealsSection", () => {
  it("shows latest-plan portions without misleading assignment totals", () => {
    render(<RollingMealsSection meals={meals} />);
    expect(screen.getByText("From your latest plan · Nov 23 - Nov 29")).toBeInTheDocument();
    expect(screen.getByText("2 portions")).toBeInTheDocument();
    expect(screen.queryByText(/unassigned|in plans/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop rolling" })).toBeInTheDocument();
  });

  it("hides empty groups and shows the empty state when no portions remain", () => {
    const { rerender } = render(<RollingMealsSection meals={meals} />);
    expect(screen.queryByText("From earlier plans")).not.toBeInTheDocument();
    rerender(<RollingMealsSection meals={{ latestPlan: null, latest: [], earlier: [], unscheduled: [] }} />);
    expect(screen.getByRole("status")).toHaveTextContent("No pending meals");
  });

  it("stops only selected portions", async () => {
    const user = userEvent.setup();
    vi.mocked(stopRollingMealsAction).mockResolvedValue({ type: "success" });
    render(<RollingMealsSection meals={meals} />);
    await user.click(screen.getByRole("button", { name: "Stop rolling" }));
    const dialog = screen.getByRole("dialog", { name: "Stop rolling Soup?" });
    await user.click(within(dialog).getByRole("checkbox", { name: "Portion 2" }));
    await user.click(within(dialog).getByRole("button", { name: "Stop rolling" }));
    expect(stopRollingMealsAction).toHaveBeenCalledWith({ entryId: "entry", expectedVersion: 2, unitIds: ["one"] });
    expect(refresh).toHaveBeenCalled();
  });

  it("keeps adjust limited to not-in-a-plan portions", async () => {
    const user = userEvent.setup();
    vi.mocked(adjustRollingMealAction).mockResolvedValue({ type: "success", entry: null });
    render(<RollingMealsSection meals={{ ...meals, latest: [], unscheduled: [{ ...meal, count: 1, unassignedCount: 1, unitIds: ["one"] }] }} />);
    await user.click(screen.getByRole("button", { name: "Adjust Soup" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(adjustRollingMealAction).toHaveBeenCalledWith({ entryId: "entry", expectedVersion: 2, count: 1 });
  });
});
