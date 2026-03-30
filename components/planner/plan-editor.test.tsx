import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PlanInputType } from "@/types/planner";

vi.mock("@/actions/planner-actions", () => ({
  updateSavedPlan: vi.fn(),
}));

vi.mock("./plan-view", () => ({
  PlanView: ({
    plan,
    onShuffle,
  }: {
    plan: PlanInputType;
    onShuffle?: (slotKey: string) => void;
  }) => {
    const first = plan[0];
    const slotKey = `${first.date.toISOString()}-${first.mealType}`;
    return (
      <button type="button" onClick={() => onShuffle?.(slotKey)}>
        Shuffle
      </button>
    );
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

import { updateSavedPlan } from "@/actions/planner-actions";
import { PlanEditor } from "./plan-editor";

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

describe("PlanEditor manual save", () => {
  it("does not auto-save when the user edits the plan", async () => {
    const user = userEvent.setup();

    const recipeA = createRecipe("recipe-a");
    const recipeB = createRecipe("recipe-b");
    const recipeC = createRecipe("recipe-c");

    const initialPlan: PlanInputType = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        mealType: "DINNER" as any,
        recipe: recipeA,
        alternatives: [recipeB, recipeC],
        used: false,
      },
    ];

    render(<PlanEditor planId="plan-1" initialPlan={initialPlan} recipes={[]} />);

    const saveButton = screen.getByRole("button", { name: "Save" });
    expect(saveButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Shuffle" }));

    expect(updateSavedPlan).not.toHaveBeenCalled();
    expect(saveButton).toBeEnabled();
  });

  it("shows Saving... and persists the whole plan when Save is clicked", async () => {
    const user = userEvent.setup();

    let resolveSave: (value: any) => void = () => {};
    const savePromise = new Promise((resolve) => {
      resolveSave = resolve;
    });

    vi.mocked(updateSavedPlan).mockReturnValue(savePromise as any);

    const recipeA = createRecipe("recipe-a");
    const recipeB = createRecipe("recipe-b");
    const recipeC = createRecipe("recipe-c");

    const initialPlan: PlanInputType = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        mealType: "DINNER" as any,
        recipe: recipeA,
        alternatives: [recipeB, recipeC],
        used: false,
      },
    ];

    render(<PlanEditor planId="plan-1" initialPlan={initialPlan} recipes={[]} />);

    await user.click(screen.getByRole("button", { name: "Shuffle" }));
    const saveButton = screen.getByRole("button", { name: "Save" });
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();

    const [planIdArg, slotsArg] = vi.mocked(updateSavedPlan).mock.calls[0]!;
    expect(planIdArg).toBe("plan-1");
    expect(slotsArg).toHaveLength(1);
    expect(slotsArg[0]!.recipeId).toBe("recipe-b");
    expect(slotsArg[0]!.alternativeRecipeIds).toEqual(["recipe-c", "recipe-a"]);

    resolveSave({ type: "success" });
    await Promise.resolve();

    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("keeps the plan dirty if edits happen while Save is in-flight", async () => {
    const user = userEvent.setup();

    let resolveSave: (value: any) => void = () => {};
    const savePromise = new Promise((resolve) => {
      resolveSave = resolve;
    });

    vi.mocked(updateSavedPlan).mockReturnValue(savePromise as any);

    const recipeA = createRecipe("recipe-a");
    const recipeB = createRecipe("recipe-b");
    const recipeC = createRecipe("recipe-c");

    const initialPlan: PlanInputType = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        mealType: "DINNER" as any,
        recipe: recipeA,
        alternatives: [recipeB, recipeC],
        used: false,
      },
    ];

    render(<PlanEditor planId="plan-1" initialPlan={initialPlan} recipes={[]} />);

    await user.click(screen.getByRole("button", { name: "Shuffle" }));
    const saveButton = screen.getByRole("button", { name: "Save" });

    await user.click(saveButton);
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Shuffle" }));

    resolveSave({ type: "success" });
    await Promise.resolve();

    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });
});

