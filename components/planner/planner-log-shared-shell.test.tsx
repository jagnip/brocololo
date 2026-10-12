import { act, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlannerLogSharedShell } from "./planner-log-shared-shell";

const { setState, resetState, planEditor, logView } = vi.hoisted(() => ({
  setState: vi.fn(),
  resetState: vi.fn(),
  planEditor: vi.fn(),
  logView: vi.fn(),
}));
const searchParams = new URLSearchParams("tab=plan");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => searchParams,
}));
vi.mock("@/components/context/topbar-context", () => ({
  useTopbar: () => ({ isLogFilterPending: false }),
}));
vi.mock("@/components/planner/plan-topbar-state-context", () => ({
  usePlanTopbarState: () => ({ setState, resetState }),
}));
vi.mock("@/components/planner/plan-editor", () => ({
  PlanEditor: (props: unknown) => {
    planEditor(props);
    return <div>Household meal editor</div>;
  },
}));
vi.mock("@/components/log/log-day-view", () => ({
  LogDayViewController: (props: unknown) => {
    logView(props);
    return <div>Actual intake</div>;
  },
}));
vi.mock("@/components/planner/plan-date-range-dialog", () => ({
  PlanDateRangeDialog: () => null,
}));
vi.mock("@/components/planner/grocery-meal-selection-dialog", () => ({
  GroceryMealSelectionDialog: () => null,
}));
vi.mock("@/actions/planner-actions", () => ({ deletePlanAction: vi.fn() }));
vi.mock("@/actions/shopping-list-actions", () => ({
  generateGroceryListFromPlan: vi.fn(),
  getGroceryGenerationMealOptions: vi.fn(),
}));

const props: ComponentProps<typeof PlannerLogSharedShell> = {
  planId: "plan-1",
  initialTab: "plan",
  initialDateRange: { start: "2026-10-09", end: "2026-10-15" },
  initialSelectedDayKey: "2026-10-09",
  initialPlan: [],
  plannerRecipes: [],
  ingredientOptions: [],
  plannedMealsBySlotKey: {},
  familyMembers: [],
  familyMemberId: "member-1",
  logData: {
    logId: "log-1",
    days: [],
    plannerPool: [],
    recipeOptions: [],
    ingredientOptions: [],
  },
  hasExistingShoppingList: false,
};

describe("separate planning and logging surfaces", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows only the meal editor on Meal plan, without Manage/Track tabs", () => {
    render(<PlannerLogSharedShell {...props} />);

    expect(screen.queryByRole("heading", { name: "Meal plan", level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByText("Arrange your household's meals and turn your plan into a grocery list.")).not.toBeInTheDocument();
    expect(screen.getByText("Household meal editor")).toBeInTheDocument();
    expect(logView).not.toHaveBeenCalled();
    expect(screen.queryByRole("tab", { name: "Manage" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Track" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open log" })).not.toBeInTheDocument();
    expect(setState).toHaveBeenCalledWith(expect.objectContaining({ onDeletePlan: expect.any(Function) }));
  });

  it("shows only actual intake on Log and does not register plan-management actions", () => {
    // A stale tab parameter must not turn the Log route into a plan editor.
    render(<PlannerLogSharedShell {...props} initialTab="log" />);

    expect(screen.queryByRole("heading", { name: "Log", level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByText("Record what each person actually ate, one day at a time.")).not.toBeInTheDocument();
    expect(screen.getByText("Actual intake")).toBeInTheDocument();
    expect(planEditor).not.toHaveBeenCalled();
    expect(setState).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: "View meal plan" })).not.toBeInTheDocument();
    expect(logView).toHaveBeenCalledWith(expect.objectContaining({
      familyMemberId: "member-1",
      initialSelectedDayKey: "2026-10-09",
      allowDayManagement: false,
    }));
  });

  it("explains a missing log", () => {
    render(<PlannerLogSharedShell {...props} initialTab="log" logData={null} />);

    expect(screen.getByRole("heading", { name: "No log yet for this plan" })).toBeInTheDocument();
    expect(planEditor).not.toHaveBeenCalled();
  });

  it("keeps saving feedback without the removed header", () => {
    render(<PlannerLogSharedShell {...props} />);
    const editorProps = planEditor.mock.calls.at(-1)![0];
    act(() => editorProps.onSaveStatusChange(true));
    expect(screen.getByRole("status")).toHaveTextContent("Saving plan");
    act(() => editorProps.onSaveStatusChange(false));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keeps Log filters and view controls without the removed header", () => {
    render(<PlannerLogSharedShell {...props} initialTab="log" />);
    const logProps = logView.mock.calls.at(-1)![0];
    act(() => logProps.onRegisterToolbarControls({
      filters: <div>Person and day controls</div>,
      viewSwitcher: <div>Day and all-days controls</div>,
    }));
    expect(screen.getByText("Person and day controls")).toBeInTheDocument();
    expect(screen.getByText("Day and all-days controls")).toBeInTheDocument();
    expect(
      screen.getByText("Day and all-days controls").compareDocumentPosition(
        screen.getByText("Person and day controls"),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
