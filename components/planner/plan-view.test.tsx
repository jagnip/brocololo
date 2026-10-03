import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { PlanInputType } from "@/types/planner";
import { PlanView } from "./plan-view";

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
  },
}));

vi.mock("./planner-slot-card", () => ({
  PlannerSlotCard: ({
    slot,
    isSelected,
    onSelectionChange,
    onCardSelect,
  }: {
    slot: { mealType: string };
    isSelected?: boolean;
    onSelectionChange?: (checked: boolean) => void;
    onCardSelect?: (modifiers: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => void;
  }) => (
    <div data-planner-selection-card="">
      <div onClick={(event) => onCardSelect?.(event)}>{slot.mealType}</div>
      <div>{isSelected ? "selected" : "not-selected"}</div>
      <button type="button" onClick={() => onSelectionChange?.(true)}>
        Select {slot.mealType}
      </button>
    </div>
  ),
}));

vi.mock("./planner-bulk-actions-footer", () => ({
  PlannerBulkActionsFooter: ({
    selectedCount,
    onReplaceMeals,
    onEditEaters,
    onRemoveMeals,
    onDone,
  }: {
    selectedCount: number;
    onReplaceMeals?: () => void;
    onEditEaters?: () => void;
    onRemoveMeals?: () => void;
    onDone: () => void;
  }) =>
    selectedCount > 0 ? (
      <div data-planner-bulk-actions="">
        <div aria-label="selected-count">{selectedCount}</div>
        {/* Keep button order explicit so the test matches the intended footer sequence. */}
        {onReplaceMeals ? <button type="button" onClick={onReplaceMeals}>Replace meals</button> : null}
        {onEditEaters ? <button type="button" onClick={onEditEaters}>Edit eaters</button> : null}
        {onRemoveMeals ? <button type="button" onClick={onRemoveMeals}>Remove meals</button> : null}
        <button type="button" onClick={onDone}>
          Done
        </button>
      </div>
    ) : null,
}));

vi.mock("./plan-slot-meal-dialog", () => ({
  PlanSlotMealDialog: () => null,
}));

vi.mock("./planner-bulk-edit-eaters-dialog", () => ({
  PlannerBulkEditEatersDialog: ({
    open,
    onCancel,
    onSave,
  }: {
    open: boolean;
    onCancel: () => void;
    onSave: (memberIds: string[]) => void;
  }) =>
    open ? (
      <div>
        <div>Edit eaters dialog</div>
        <button type="button" onClick={() => onSave(["fm-b"])}>
          Submit eaters
        </button>
        <button type="button" onClick={onCancel}>
          Cancel edit eaters
        </button>
      </div>
    ) : null,
}));

function createRecipe(id: string) {
  return {
    id,
    name: id,
    slug: id,
    images: [],
    notes: [],
    instructions: [],
    ingredientGroups: [],
    servings: 1,
    servingMultiplierForNelson: 1,
    calories: 0,
    proteins: 0,
    fats: 0,
    carbs: 0,
    ingredients: [],
  } as any;
}

function createSlot(date: string, mealType: string, cookingFamilyMemberIds: string[]) {
  return {
    date: new Date(date),
    mealType: mealType as any,
    recipe: createRecipe(`${mealType.toLowerCase()}-recipe`),
    alternatives: [],
    customMeal: null,
    used: false,
    cookingFamilyMemberIds,
  };
}

function renderPlanView(props: Partial<ComponentProps<typeof PlanView>> = {}) {
  const plan: PlanInputType = [
    createSlot("2026-03-17T00:00:00.000Z", "BREAKFAST", ["fm-a"]),
    createSlot("2026-03-17T00:00:00.000Z", "LUNCH", ["fm-a"]),
  ];

  return render(
    <PlanView
      plan={plan}
      recipes={[]}
      ingredientOptions={[]}
      familyMembers={[
        { id: "fm-a", name: "Ada", isSelf: true },
        { id: "fm-b", name: "Ben", isSelf: false },
      ] as any}
      {...props}
    />,
  );
}

describe("PlanView bulk edit eaters", () => {
  it("replaces plain-click selection, toggles with Ctrl/Cmd, and clears outside or on Escape", () => {
    renderPlanView();
    fireEvent.click(screen.getByText("BREAKFAST"));
    fireEvent.click(screen.getByText("LUNCH"));
    expect(screen.getByLabelText("selected-count")).toHaveTextContent("1");
    fireEvent.click(screen.getByText("LUNCH"));
    expect(screen.getByLabelText("selected-count")).toHaveTextContent("1");
    fireEvent.click(screen.getByText("BREAKFAST"), { ctrlKey: true });
    expect(screen.getByLabelText("selected-count")).toHaveTextContent("2");
    fireEvent.click(screen.getByText("BREAKFAST"), { metaKey: true });
    expect(screen.getByLabelText("selected-count")).toHaveTextContent("1");
    fireEvent.click(document.body);
    expect(screen.queryByLabelText("selected-count")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("BREAKFAST"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByLabelText("selected-count")).not.toBeInTheDocument();
  });

  it("selects ranges in either direction and keeps the original anchor", () => {
    renderPlanView({
      plan: [
        createSlot("2026-03-17T00:00:00.000Z", "BREAKFAST", []),
        createSlot("2026-03-17T00:00:00.000Z", "LUNCH", []),
        createSlot("2026-03-17T00:00:00.000Z", "DINNER", []),
      ],
    });
    fireEvent.click(screen.getByText("DINNER"));
    fireEvent.click(screen.getByText("BREAKFAST"), { shiftKey: true });
    expect(screen.getByLabelText("selected-count")).toHaveTextContent("3");
    fireEvent.click(screen.getByText("LUNCH"), { shiftKey: true });
    expect(screen.getByLabelText("selected-count")).toHaveTextContent("2");
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByText("BREAKFAST"), { shiftKey: true });
    expect(screen.getByLabelText("selected-count")).toHaveTextContent("1");
    fireEvent.click(screen.getByText("DINNER"), { shiftKey: true });
    expect(screen.getByLabelText("selected-count")).toHaveTextContent("3");
  });

  it("clears selection on plan whitespace but preserves it in the toolbar and bulk dialog", () => {
    const { container } = renderPlanView({ onAudienceChange: vi.fn() });
    fireEvent.click(screen.getByText("BREAKFAST"));
    fireEvent.click(screen.getByLabelText("selected-count"));
    expect(screen.getByLabelText("selected-count")).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: "Edit eaters" }));
    fireEvent.click(screen.getByText("Edit eaters dialog"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel edit eaters" }));
    expect(screen.getByLabelText("selected-count")).toHaveTextContent("1");
    fireEvent.click(container.querySelector("section")!);
    expect(screen.queryByLabelText("selected-count")).not.toBeInTheDocument();
  });

  it("shows bulk actions in the expected order when audience editing is available", async () => {
    const user = userEvent.setup();

    renderPlanView({
      onSetMeal: vi.fn(),
      onRemove: vi.fn(),
      onAudienceChange: vi.fn(),
    });

    await user.click(screen.getByRole("button", { name: "Select BREAKFAST" }));

    const buttons = screen.getAllByRole("button").map((button) => button.textContent);
    expect(buttons).toContain("Replace meals");
    expect(buttons).toContain("Edit eaters");
    expect(buttons).toContain("Remove meals");

    const replaceIndex = buttons.indexOf("Replace meals");
    const editIndex = buttons.indexOf("Edit eaters");
    const removeIndex = buttons.indexOf("Remove meals");
    expect(replaceIndex).toBeLessThan(editIndex);
    expect(editIndex).toBeLessThan(removeIndex);
  });

  it("applies the selected eaters to every selected slot and clears selection", async () => {
    const user = userEvent.setup();
    const onAudienceChange = vi.fn();

    renderPlanView({
      onAudienceChange,
    });

    await user.click(screen.getByRole("button", { name: "Select BREAKFAST" }));
    await user.click(screen.getByRole("button", { name: "Select LUNCH" }));
    expect(screen.getByLabelText("selected-count")).toHaveTextContent("2");

    await user.click(screen.getByRole("button", { name: "Edit eaters" }));
    expect(screen.getByText("Edit eaters dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Submit eaters" }));

    expect(onAudienceChange).toHaveBeenCalledTimes(2);
    expect(onAudienceChange).toHaveBeenNthCalledWith(
      1,
      "2026-03-17T00:00:00.000Z-BREAKFAST",
      ["fm-b"],
    );
    expect(onAudienceChange).toHaveBeenNthCalledWith(
      2,
      "2026-03-17T00:00:00.000Z-LUNCH",
      ["fm-b"],
    );

    await waitFor(() => {
      expect(screen.queryByLabelText("selected-count")).not.toBeInTheDocument();
    });
  });

  it("does not expose bulk edit eaters when audience editing is unavailable", async () => {
    const user = userEvent.setup();

    renderPlanView({
      onSetMeal: vi.fn(),
      onRemove: vi.fn(),
    });

    await user.click(screen.getByRole("button", { name: "Select BREAKFAST" }));

    expect(screen.queryByRole("button", { name: "Edit eaters" })).not.toBeInTheDocument();
  });
});
