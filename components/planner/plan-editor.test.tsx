import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanInputType } from "@/types/planner";
import { PlannerMealType } from "@/src/generated/enums";

const pushMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("@/actions/planner-actions", () => ({
  updateSavedPlan: vi.fn(),
  generateLogFromPlan: vi.fn(),
  deletePlanAction: vi.fn(),
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

    const dinnerByDay = plan
      .filter((s) => s.mealType === PlannerMealType.DINNER)
      .map((s) => `${s.date.toISOString().slice(0, 10)}:${s.recipe?.id ?? "empty"}`)
      .join(",");

    return (
      <div>
        <div aria-label="slot-count">{plan.length}</div>
        <div aria-label="dinner-by-day">{dinnerByDay}</div>
        <button type="button" onClick={() => onShuffle?.(slotKey)}>
          Shuffle
        </button>
      </div>
    );
  },
}));

vi.mock("./date-range-picker", () => ({
  getDefaultDateRange: () => ({ start: "2026-03-17", end: "2026-03-24" }),
  WeekPicker: ({ value, onChange }: { value: any; onChange: any }) => (
    <div>
      <button type="button" onClick={() => onChange({ start: value.start, end: value.end })}>
        Range same
      </button>
      <button type="button" onClick={() => onChange({ start: "2026-03-18", end: "2026-03-18" })}>
        Range shrink
      </button>
      <button type="button" onClick={() => onChange({ start: "2026-03-17", end: "2026-03-19" })}>
        Range restore
      </button>
      <button
        type="button"
        onClick={() => onChange({ start: "2026-04-10", end: "2026-04-15" })}
      >
        Range extend
      </button>
    </div>
  ),
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
    useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  };
});

import { toast } from "sonner";
import { deletePlanAction, generateLogFromPlan, updateSavedPlan } from "@/actions/planner-actions";
import { PlanTopbarStateProvider } from "@/components/planner/plan-topbar-state-context";
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

function renderPlanEditor(props: React.ComponentProps<typeof PlanEditor>) {
  return render(
    <PlanTopbarStateProvider>
      <PlanEditor {...props} />
    </PlanTopbarStateProvider>,
  );
}

describe("PlanEditor autosave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMock.mockClear();
    refreshMock.mockClear();
  });

  it("auto-saves after a short debounce when user edits the plan", async () => {
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

    renderPlanEditor({ planId: "plan-1", initialPlan, recipes: [] });

    await user.click(screen.getByRole("button", { name: "Shuffle" }));

    expect(updateSavedPlan).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(updateSavedPlan).toHaveBeenCalledTimes(1);
    }, { timeout: 2500 });
  });

  it("persists the whole plan payload via autosave", async () => {
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

    renderPlanEditor({ planId: "plan-1", initialPlan, recipes: [] });

    await user.click(screen.getByRole("button", { name: "Shuffle" }));
    await waitFor(() => {
      expect(vi.mocked(updateSavedPlan)).toHaveBeenCalledTimes(1);
    }, { timeout: 2500 });

    const [planIdArg, slotsArg] = vi.mocked(updateSavedPlan).mock.calls[0]!;
    expect(planIdArg).toBe("plan-1");
    expect(slotsArg).toHaveLength(1);
    expect(slotsArg[0]!.recipeId).toBe("recipe-b");
    expect(slotsArg[0]!.alternativeRecipeIds).toEqual(["recipe-c", "recipe-a"]);

    resolveSave({ type: "success" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Generate log" })).toBeEnabled();
    });
  });

  it("keeps the plan dirty if edits happen while autosave is in-flight", async () => {
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

    renderPlanEditor({ planId: "plan-1", initialPlan, recipes: [] });

    await user.click(screen.getByRole("button", { name: "Shuffle" }));
    await waitFor(() => {
      expect(vi.mocked(updateSavedPlan)).toHaveBeenCalledTimes(1);
    }, { timeout: 2500 });
    expect(screen.getByRole("button", { name: "Generate log" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Shuffle" }));

    resolveSave({ type: "success" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Generate log" })).toBeDisabled();
    });
  });

  it("shows sync warning dialog and retries with force when confirmed", async () => {
    const user = userEvent.setup();
    const recipeA = createRecipe("recipe-a");
    const recipeB = createRecipe("recipe-b");
    const recipeC = createRecipe("recipe-c");

    vi.mocked(updateSavedPlan)
      .mockResolvedValueOnce({
        type: "sync_conflict",
        impactedDates: ["2026-03-17"],
        impactedLogMealsCount: 2,
        impactedPlanMealsCount: 1,
      } as any)
      .mockResolvedValueOnce({ type: "success" } as any);

    renderPlanEditor({
      planId: "plan-1",
      initialPlan: [
        {
          date: new Date("2026-03-17T00:00:00.000Z"),
          mealType: "DINNER" as any,
          recipe: recipeA,
          alternatives: [recipeB, recipeC],
          used: false,
        },
      ],
      recipes: [],
    });

    await user.click(screen.getByRole("button", { name: "Shuffle" }));
    await waitFor(() => {
      expect(screen.getByText(/sync will remove existing meals/i)).toBeInTheDocument();
    }, { timeout: 2500 });

    await user.click(screen.getByRole("button", { name: "Save and sync" }));

    expect(vi.mocked(updateSavedPlan).mock.calls[1]?.[2]).toEqual({
      forceDestructiveSync: true,
    });
  });

  it("keeps editor dirty when save hits date conflict", async () => {
    const user = userEvent.setup();
    const recipeA = createRecipe("recipe-a");
    const recipeB = createRecipe("recipe-b");
    const recipeC = createRecipe("recipe-c");

    vi.mocked(updateSavedPlan).mockResolvedValueOnce({
      type: "date_conflict",
      dates: ["2026-03-18"],
      conflictingLogIds: ["log-2"],
      conflictingPlanIds: ["plan-2"],
    } as any);

    renderPlanEditor({
      planId: "plan-1",
      initialPlan: [
        {
          date: new Date("2026-03-17T00:00:00.000Z"),
          mealType: "DINNER" as any,
          recipe: recipeA,
          alternatives: [recipeB, recipeC],
          used: false,
        },
      ],
      recipes: [],
    });

    await user.click(screen.getByRole("button", { name: "Shuffle" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Cannot save. Date conflict: Mar 18, 2026",
      );
    }, { timeout: 2500 });
    expect(screen.getByRole("button", { name: "Generate log" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Shuffle" }));
    await waitFor(() => {
      expect(vi.mocked(updateSavedPlan)).toHaveBeenCalledTimes(2);
    }, { timeout: 2500 });
  });

  it("rebase creates empty slots and marks editor dirty when date range changes", async () => {
    const user = userEvent.setup();

    renderPlanEditor({ planId: "plan-1", initialPlan: initialPlanForTests(), recipes: [] });

    // When the range expands, the editor should create empty meal slots for the new days,
    // and mark editor dirty so generation is blocked until autosave finishes.
    const beforeCount = Number(screen.getByLabelText("slot-count").textContent);

    await user.click(screen.getByRole("button", { name: "Range extend" }));

    const afterCount = Number(screen.getByLabelText("slot-count").textContent);
    expect(afterCount).toBeGreaterThan(beforeCount);

    expect(screen.getByRole("button", { name: "Generate log" })).toBeDisabled();
  });

  it("preserves recipes in memory when shrinking then restoring before Save", async () => {
    const user = userEvent.setup();

    const recipe17 = createRecipe("recipe-17");
    const recipe18 = createRecipe("recipe-18");
    const recipe19 = createRecipe("recipe-19");

    const initialPlan3Days: PlanInputType = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        mealType: PlannerMealType.DINNER,
        recipe: recipe17,
        alternatives: [],
        used: false,
      },
      {
        date: new Date("2026-03-18T00:00:00.000Z"),
        mealType: PlannerMealType.DINNER,
        recipe: recipe18,
        alternatives: [],
        used: false,
      },
      {
        date: new Date("2026-03-19T00:00:00.000Z"),
        mealType: PlannerMealType.DINNER,
        recipe: recipe19,
        alternatives: [],
        used: false,
      },
    ];

    renderPlanEditor({ planId: "plan-1", initialPlan: initialPlan3Days, recipes: [] });

    // Before shrinking, we should see dinner recipes for all 3 days.
    expect(screen.getByLabelText("dinner-by-day").textContent).toContain("2026-03-17:recipe-17");
    expect(screen.getByLabelText("dinner-by-day").textContent).toContain("2026-03-18:recipe-18");
    expect(screen.getByLabelText("dinner-by-day").textContent).toContain("2026-03-19:recipe-19");

    await user.click(screen.getByRole("button", { name: "Range shrink" }));
    // Changing `start` from 2026-03-17 -> 2026-03-18 shifts existing slots forward by +1 day.
    // So the recipe that was on 2026-03-17 should appear on 2026-03-18.
    expect(screen.getByLabelText("dinner-by-day").textContent).toBe("2026-03-18:recipe-17");

    await user.click(screen.getByRole("button", { name: "Range restore" }));
    const dinnerAfterRestore = screen.getByLabelText("dinner-by-day").textContent ?? "";
    expect(dinnerAfterRestore).toContain("2026-03-17:recipe-17");
    expect(dinnerAfterRestore).toContain("2026-03-18:recipe-18");
    expect(dinnerAfterRestore).toContain("2026-03-19:recipe-19");

    expect(screen.getByRole("button", { name: "Generate log" })).toBeDisabled();
  });

  it("disables Generate log when the editor is dirty", async () => {
    const user = userEvent.setup();

    renderPlanEditor({ planId: "plan-1", initialPlan: initialPlanForTests(), recipes: [] });

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

    renderPlanEditor({ planId: "plan-1", initialPlan: initialPlanForTests(), recipes: [] });

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

    renderPlanEditor({ planId: "plan-1", initialPlan: initialPlanForTests(), recipes: [] });

    await user.click(screen.getByRole("button", { name: "Generate log" }));

    expect(toast.info).toHaveBeenCalledWith("Log already generated for this plan.");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows conflict dates and stays on plan when plan days already exist in logs", async () => {
    const user = userEvent.setup();

    vi.mocked(generateLogFromPlan).mockResolvedValue({
      type: "date_conflict",
      dates: ["2026-04-10", "2026-04-12"],
    });

    renderPlanEditor({ planId: "plan-1", initialPlan: initialPlanForTests(), recipes: [] });

    await user.click(screen.getByRole("button", { name: "Generate log" }));

    expect(toast.info).toHaveBeenCalledWith(
      "Cannot generate log. These dates already exist in a log: Apr 10, 2026, Apr 12, 2026",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("redirects to current planner route after deleting a plan", async () => {
    const user = userEvent.setup();
    vi.mocked(deletePlanAction).mockResolvedValue({ type: "success" });

    render(<PlanEditor planId="plan-1" initialPlan={initialPlanForTests()} recipes={[]} />);

    await user.click(screen.getByRole("button", { name: "Delete plan" }));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete plan" }));

    expect(vi.mocked(deletePlanAction)).toHaveBeenCalledWith("plan-1");
    expect(pushMock).toHaveBeenCalledWith("/plan/current");
    expect(refreshMock).toHaveBeenCalled();
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

