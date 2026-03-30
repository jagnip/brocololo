import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanInputType } from "@/types/planner";

const pushMock = vi.hoisted(() => vi.fn());

vi.mock("@/actions/planner-actions", () => ({
  updateSavedPlan: vi.fn(),
  generateLogFromPlan: vi.fn(),
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
    info: vi.fn(),
  },
}));

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    useRouter: () => ({ push: pushMock }),
  };
});

import { toast } from "sonner";
import { generateLogFromPlan, updateSavedPlan } from "@/actions/planner-actions";
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
  beforeEach(() => {
    vi.clearAllMocks();
    pushMock.mockClear();
  });

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
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    });
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
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    });
  });

  it("disables Generate log when the editor is dirty", async () => {
    const user = userEvent.setup();

    render(<PlanEditor planId="plan-1" initialPlan={initialPlanForTests()} recipes={[]} />);

    const generateButton = screen.getByRole("button", { name: "Generate log" });
    expect(generateButton).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Shuffle" }));

    expect(screen.getByRole("button", { name: "Generate log" })).toBeDisabled();
  });

  it("redirects to log page on Generate log success", async () => {
    const user = userEvent.setup();

    vi.mocked(generateLogFromPlan).mockResolvedValue({
      type: "success",
      logId: "log-1",
    });

    render(<PlanEditor planId="plan-1" initialPlan={initialPlanForTests()} recipes={[]} />);

    await user.click(screen.getByRole("button", { name: "Generate log" }));

    expect(vi.mocked(generateLogFromPlan)).toHaveBeenCalledWith("plan-1");
    expect(pushMock).toHaveBeenCalledWith("/log/log-1");
  });

  it("shows info and stays on plan when log already exists", async () => {
    const user = userEvent.setup();

    vi.mocked(generateLogFromPlan).mockResolvedValue({
      type: "already_exists",
      logId: "log-1",
    });

    render(<PlanEditor planId="plan-1" initialPlan={initialPlanForTests()} recipes={[]} />);

    await user.click(screen.getByRole("button", { name: "Generate log" }));

    expect(toast.info).toHaveBeenCalledWith("Log already generated for this plan.");
    expect(pushMock).not.toHaveBeenCalled();
  });
});

function initialPlanForTests(): PlanInputType {
  const recipeA = createRecipe("recipe-a");
  const recipeB = createRecipe("recipe-b");
  const recipeC = createRecipe("recipe-c");

  return [
    {
      date: new Date("2026-03-17T00:00:00.000Z"),
      mealType: "DINNER" as any,
      recipe: recipeA,
      alternatives: [recipeB, recipeC],
      used: false,
    },
  ];
}

