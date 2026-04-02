import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogMealType } from "@/src/generated/enums";
import { LogDayView } from "./log-day-view";
import type { LogDayData } from "@/lib/log/view-model";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
  usePathname: () => "/log/log-1",
  useSearchParams: () => new URLSearchParams(""),
}));

const appendNextLogDayActionMock = vi.fn();
const removeLogDayActionMock = vi.fn();

vi.mock("@/actions/log-actions", () => ({
  appendNextLogDayAction: (...args: unknown[]) =>
    appendNextLogDayActionMock(...args),
  removeLogDayAction: (...args: unknown[]) => removeLogDayActionMock(...args),
  clearLogEntryAssignmentAction: vi.fn(),
  placePlannerPoolItemAction: vi.fn(),
  upsertLogSlotAction: vi.fn(),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  // Cmdk-based selects rely on ResizeObserver in jsdom tests.
  globalThis.ResizeObserver =
    ResizeObserverMock as unknown as typeof ResizeObserver;
}

if (!HTMLElement.prototype.scrollIntoView) {
  // Cmdk attempts to scroll highlighted options into view.
  HTMLElement.prototype.scrollIntoView = () => {};
}

// Radix Select uses pointer capture APIs which aren't implemented in jsdom.
if (!("hasPointerCapture" in Element.prototype)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Element.prototype as any).hasPointerCapture = () => false;
}
if (!("setPointerCapture" in Element.prototype)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Element.prototype as any).setPointerCapture = () => {};
}
if (!("releasePointerCapture" in Element.prototype)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Element.prototype as any).releasePointerCapture = () => {};
}

const ingredientFormDependencies = {
  categories: [{ id: "cat-dairy", name: "Dairy" }],
  units: [{ id: "unit-g", name: "g", namePlural: null }],
  gramsUnitId: "unit-g",
  iconOptions: [],
};

describe("LogDayView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appendNextLogDayActionMock.mockResolvedValue({
      type: "success",
      dateKey: "2026-03-18",
    });
    removeLogDayActionMock.mockResolvedValue({
      type: "success",
      nextDayKey: "2026-03-19",
    });
  });

  it("groups duplicate planner pool cards and shows quantity counter", () => {
    const days: LogDayData[] = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        dateKey: "2026-03-17",
        slots: [
          {
            entryId: "entry-breakfast",
            mealType: LogMealType.BREAKFAST,
            label: "Breakfast",
            recipes: [],
          },
          {
            entryId: "entry-lunch",
            mealType: LogMealType.LUNCH,
            label: "Lunch",
            recipes: [],
          },
          {
            entryId: "entry-snack",
            mealType: LogMealType.SNACK,
            label: "Snack",
            recipes: [],
          },
          {
            entryId: "entry-dinner",
            mealType: LogMealType.DINNER,
            label: "Dinner",
            recipes: [],
          },
        ],
      },
    ];

    render(
      <LogDayView
        days={days}
        plannerPool={[
          {
            id: "pool-1",
            date: new Date("2026-03-17T00:00:00.000Z"),
            dateKey: "2026-03-17",
            mealType: LogMealType.DINNER,
            mealLabel: "Dinner",
            title: "Salmon Rice",
            sourceRecipeId: "recipe-salmon-rice",
            imageUrl: null,
            ingredients: [],
          },
          {
            id: "pool-2",
            date: new Date("2026-03-18T00:00:00.000Z"),
            dateKey: "2026-03-18",
            mealType: LogMealType.BREAKFAST,
            mealLabel: "Breakfast",
            title: "Salmon Rice",
            sourceRecipeId: "recipe-salmon-rice",
            imageUrl: null,
            ingredients: [],
          },
        ]}
      />,
    );

    expect(screen.getByText("Planned meals")).toBeInTheDocument();
    expect(screen.getByText("Salmon Rice")).toBeInTheDocument();
    expect(screen.getByText("x2")).toBeInTheDocument();
  });

  it("renders all four slots and shows snack recipe when present", () => {
    const days: LogDayData[] = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        dateKey: "2026-03-17",
        slots: [
          {
            mealType: LogMealType.BREAKFAST,
            label: "Breakfast",
            recipes: [
              {
                id: "r1",
                entryRecipeId: "r1",
                sourceRecipeId: "recipe-oatmeal",
                mealLabel: "Breakfast",
                cardKind: "recipe",
                title: "Oatmeal",
                slug: "oatmeal",
                imageUrl: null,
                calories: 350,
                proteins: 12,
                fats: 7,
                carbs: 60,
              },
            ],
          },
          {
            mealType: LogMealType.LUNCH,
            label: "Lunch",
            recipes: [
              {
                id: "r2",
                entryRecipeId: "r2",
                sourceRecipeId: "recipe-chicken-bowl",
                mealLabel: "Lunch",
                cardKind: "recipe",
                title: "Chicken Bowl",
                slug: "chicken-bowl",
                imageUrl: null,
                calories: 500,
                proteins: 40,
                fats: 18,
                carbs: 30,
              },
            ],
          },
          {
            mealType: LogMealType.SNACK,
            label: "Snack",
            recipes: [
              {
                id: "r-snack",
                entryRecipeId: "r-snack",
                sourceRecipeId: "recipe-yogurt",
                mealLabel: "Snack",
                cardKind: "recipe",
                title: "Yogurt with frozen fruits and nuts",
                slug: "yogurt-with-frozen-fruits-and-nuts",
                imageUrl: null,
                calories: 280,
                proteins: 18,
                fats: 10,
                carbs: 26,
              },
            ],
          },
          {
            mealType: LogMealType.DINNER,
            label: "Dinner",
            recipes: [
              {
                id: "r3",
                entryRecipeId: "r3",
                sourceRecipeId: "recipe-salmon-rice",
                mealLabel: "Dinner",
                cardKind: "recipe",
                title: "Salmon Rice",
                slug: "salmon-rice",
                imageUrl: null,
                calories: 620,
                proteins: 45,
                fats: 22,
                carbs: 48,
              },
            ],
          },
        ],
      },
    ];

    render(<LogDayView days={days} />);

    expect(screen.getAllByText("Breakfast").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lunch").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Snack").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dinner").length).toBeGreaterThan(0);

    expect(screen.getByText("Oatmeal")).toBeInTheDocument();
    expect(screen.getByText("Chicken Bowl")).toBeInTheDocument();
    expect(screen.getByText("Salmon Rice")).toBeInTheDocument();
    expect(screen.getByText("1750 kcal")).toBeInTheDocument();
    expect(screen.getByText("115.0g protein")).toBeInTheDocument();
    expect(screen.getByText("57.0g fat")).toBeInTheDocument();
    expect(screen.getByText("164.0g carbs")).toBeInTheDocument();
    expect(screen.queryByText("Snack: empty")).not.toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /yogurt with frozen fruits and nuts/i,
      }),
    ).toBeInTheDocument();
  });

  it("shows one day at a time and switches by date tabs", async () => {
    const user = userEvent.setup();
    const days: LogDayData[] = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        dateKey: "2026-03-17",
        slots: [
          {
            mealType: LogMealType.BREAKFAST,
            label: "Breakfast",
            recipes: [
              {
                id: "r1",
                entryRecipeId: "r1",
                sourceRecipeId: "recipe-oatmeal",
                mealLabel: "Breakfast",
                cardKind: "recipe",
                title: "Oatmeal",
                slug: "oatmeal",
                imageUrl: null,
                calories: 350,
                proteins: 12,
                fats: 7,
                carbs: 60,
              },
            ],
          },
          { mealType: LogMealType.LUNCH, label: "Lunch", recipes: [] },
          { mealType: LogMealType.SNACK, label: "Snack", recipes: [] },
          { mealType: LogMealType.DINNER, label: "Dinner", recipes: [] },
        ],
      },
      {
        date: new Date("2026-03-18T00:00:00.000Z"),
        dateKey: "2026-03-18",
        slots: [
          {
            mealType: LogMealType.BREAKFAST,
            label: "Breakfast",
            recipes: [
              {
                id: "r2",
                entryRecipeId: "r2",
                sourceRecipeId: "recipe-eggs",
                mealLabel: "Breakfast",
                cardKind: "recipe",
                title: "Scrambled Eggs",
                slug: "scrambled-eggs",
                imageUrl: null,
                calories: 280,
                proteins: 20,
                fats: 18,
                carbs: 4,
              },
            ],
          },
          { mealType: LogMealType.LUNCH, label: "Lunch", recipes: [] },
          { mealType: LogMealType.SNACK, label: "Snack", recipes: [] },
          { mealType: LogMealType.DINNER, label: "Dinner", recipes: [] },
        ],
      },
    ];

    render(<LogDayView days={days} />);

    expect(screen.getByText("Oatmeal")).toBeInTheDocument();
    expect(screen.queryByText("Scrambled Eggs")).not.toBeInTheDocument();

    // Day selector is now a dropdown (combobox) instead of date pill buttons.
    await user.click(screen.getByRole("combobox"));
    const nextDayOption = await screen.findByText(/wednesday 18 mar/i);
    await user.click(nextDayOption);

    expect(screen.getByText("Scrambled Eggs")).toBeInTheDocument();
    expect(screen.queryByText("Oatmeal")).not.toBeInTheDocument();
  });

  it("uses initialSelectedDayKey when provided", () => {
    const days: LogDayData[] = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        dateKey: "2026-03-17",
        slots: [
          {
            mealType: LogMealType.BREAKFAST,
            label: "Breakfast",
            recipes: [
              {
                id: "r1",
                entryRecipeId: "r1",
                sourceRecipeId: "recipe-oatmeal",
                mealLabel: "Breakfast",
                cardKind: "recipe",
                title: "Oatmeal",
                slug: "oatmeal",
                imageUrl: null,
                calories: 350,
                proteins: 12,
                fats: 7,
                carbs: 60,
              },
            ],
          },
          { mealType: LogMealType.LUNCH, label: "Lunch", recipes: [] },
          { mealType: LogMealType.SNACK, label: "Snack", recipes: [] },
          { mealType: LogMealType.DINNER, label: "Dinner", recipes: [] },
        ],
      },
      {
        date: new Date("2026-03-18T00:00:00.000Z"),
        dateKey: "2026-03-18",
        slots: [
          {
            mealType: LogMealType.BREAKFAST,
            label: "Breakfast",
            recipes: [
              {
                id: "r2",
                entryRecipeId: "r2",
                sourceRecipeId: "recipe-eggs",
                mealLabel: "Breakfast",
                cardKind: "recipe",
                title: "Scrambled Eggs",
                slug: "scrambled-eggs",
                imageUrl: null,
                calories: 280,
                proteins: 20,
                fats: 18,
                carbs: 4,
              },
            ],
          },
          { mealType: LogMealType.LUNCH, label: "Lunch", recipes: [] },
          { mealType: LogMealType.SNACK, label: "Snack", recipes: [] },
          { mealType: LogMealType.DINNER, label: "Dinner", recipes: [] },
        ],
      },
    ];

    render(<LogDayView days={days} initialSelectedDayKey="2026-03-18" />);

    expect(screen.getByText("Scrambled Eggs")).toBeInTheDocument();
    expect(screen.queryByText("Oatmeal")).not.toBeInTheDocument();
  });

  it("renders ingredient editor inline when recipe card is clicked", async () => {
    const user = userEvent.setup();

    const days: LogDayData[] = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        dateKey: "2026-03-17",
        slots: [
          {
            mealType: LogMealType.BREAKFAST,
            label: "Breakfast",
            recipes: [
              {
                id: "entry-recipe-1",
                entryId: "entry-1",
                entryRecipeId: "entry-recipe-1",
                sourceRecipeId: "recipe-oatmeal",
                mealLabel: "Breakfast",
                cardKind: "recipe",
                title: "Oatmeal",
                slug: "oatmeal",
                imageUrl: null,
                calories: 350,
                proteins: 12,
                fats: 7,
                carbs: 60,
                ingredients: [
                  {
                    ingredientId: "ingredient-1",
                    ingredientName: "Oats",
                    unitId: "unit-g",
                    unitName: "g",
                    amount: 60,
                  },
                ],
              },
            ],
          },
          {
            mealType: LogMealType.LUNCH,
            label: "Lunch",
            recipes: [],
          },
          {
            mealType: LogMealType.SNACK,
            label: "Snack",
            recipes: [],
          },
          {
            mealType: LogMealType.DINNER,
            label: "Dinner",
            recipes: [],
          },
        ],
      },
    ];

    render(
      <LogDayView
        days={days}
        logId="log-1"
        person="PRIMARY"
        ingredientOptions={[
          {
            id: "ingredient-1",
            name: "Oats",
            brand: null,
            defaultUnitId: "unit-g",
            calories: 380,
            proteins: 13,
            fats: 7,
            carbs: 68,
            unitConversions: [
              {
                unitId: "unit-g",
                gramsPerUnit: 1,
                unitName: "g",
                unitNamePlural: null,
              },
            ],
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /oatmeal/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getAllByText("Breakfast").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Recipe (optional)").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: /add ingredient/i }).length,
    ).toBeGreaterThan(0);
  });

  it("adds next day and navigates to new day tab URL", async () => {
    const user = userEvent.setup();
    const days: LogDayData[] = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        dateKey: "2026-03-17",
        slots: [
          {
            entryId: "entry-breakfast",
            mealType: LogMealType.BREAKFAST,
            label: "Breakfast",
            recipes: [],
          },
          {
            entryId: "entry-lunch",
            mealType: LogMealType.LUNCH,
            label: "Lunch",
            recipes: [],
          },
          {
            entryId: "entry-snack",
            mealType: LogMealType.SNACK,
            label: "Snack",
            recipes: [],
          },
          {
            entryId: "entry-dinner",
            mealType: LogMealType.DINNER,
            label: "Dinner",
            recipes: [],
          },
        ],
      },
    ];

    render(<LogDayView days={days} logId="log-1" person="PRIMARY" />);

    await user.click(screen.getByRole("button", { name: /add day/i }));

    await waitFor(() => {
      expect(appendNextLogDayActionMock).toHaveBeenCalledWith({
        logId: "log-1",
      });
      expect(pushMock).toHaveBeenCalledWith(
        "/log/log-1?person=PRIMARY&day=2026-03-18",
      );
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("does not navigate when add day collides with another owner", async () => {
    const user = userEvent.setup();
    appendNextLogDayActionMock.mockResolvedValueOnce({
      type: "date_conflict",
      dates: ["2026-03-18"],
      conflictingLogIds: ["log-2"],
      conflictingPlanIds: ["plan-2"],
    });

    const days: LogDayData[] = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        dateKey: "2026-03-17",
        slots: [
          { entryId: "entry-breakfast", mealType: LogMealType.BREAKFAST, label: "Breakfast", recipes: [] },
          { entryId: "entry-lunch", mealType: LogMealType.LUNCH, label: "Lunch", recipes: [] },
          { entryId: "entry-snack", mealType: LogMealType.SNACK, label: "Snack", recipes: [] },
          { entryId: "entry-dinner", mealType: LogMealType.DINNER, label: "Dinner", recipes: [] },
        ],
      },
    ];

    render(<LogDayView days={days} logId="log-1" person="PRIMARY" />);
    await user.click(screen.getByRole("button", { name: /add day/i }));

    await waitFor(() => {
      expect(appendNextLogDayActionMock).toHaveBeenCalledWith({ logId: "log-1" });
      expect(pushMock).not.toHaveBeenCalledWith("/log/log-1?person=PRIMARY&day=2026-03-18");
    });
  });

  it("removes day and navigates to fallback day", async () => {
    const user = userEvent.setup();
    const days: LogDayData[] = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        dateKey: "2026-03-17",
        slots: [
          {
            entryId: "entry-breakfast-1",
            mealType: LogMealType.BREAKFAST,
            label: "Breakfast",
            recipes: [],
          },
          {
            entryId: "entry-lunch-1",
            mealType: LogMealType.LUNCH,
            label: "Lunch",
            recipes: [],
          },
          {
            entryId: "entry-snack-1",
            mealType: LogMealType.SNACK,
            label: "Snack",
            recipes: [],
          },
          {
            entryId: "entry-dinner-1",
            mealType: LogMealType.DINNER,
            label: "Dinner",
            recipes: [],
          },
        ],
      },
      {
        date: new Date("2026-03-18T00:00:00.000Z"),
        dateKey: "2026-03-18",
        slots: [
          {
            entryId: "entry-breakfast-2",
            mealType: LogMealType.BREAKFAST,
            label: "Breakfast",
            recipes: [],
          },
          {
            entryId: "entry-lunch-2",
            mealType: LogMealType.LUNCH,
            label: "Lunch",
            recipes: [],
          },
          {
            entryId: "entry-snack-2",
            mealType: LogMealType.SNACK,
            label: "Snack",
            recipes: [],
          },
          {
            entryId: "entry-dinner-2",
            mealType: LogMealType.DINNER,
            label: "Dinner",
            recipes: [],
          },
        ],
      },
    ];

    render(<LogDayView days={days} logId="log-1" person="PRIMARY" />);

    const removeButtons = screen.getAllByRole("button", {
      name: /remove day/i,
    });
    await user.click(removeButtons[0]!);

    await waitFor(() => {
      expect(removeLogDayActionMock).toHaveBeenCalledWith({
        logId: "log-1",
        dateKey: "2026-03-17",
      });
      expect(pushMock).toHaveBeenCalledWith(
        "/log/log-1?person=PRIMARY&day=2026-03-19",
      );
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("shows warning dialog for impacted day and removes only after confirmation", async () => {
    const user = userEvent.setup();
    removeLogDayActionMock
      .mockResolvedValueOnce({
        type: "impact_warning",
        impactedDates: ["2026-03-17"],
        impactedLogMealsCount: 2,
        impactedPlanMealsCount: 1,
      })
      .mockResolvedValueOnce({
        type: "success",
        nextDayKey: "2026-03-18",
      });

    const days: LogDayData[] = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        dateKey: "2026-03-17",
        slots: [
          { entryId: "entry-breakfast-1", mealType: LogMealType.BREAKFAST, label: "Breakfast", recipes: [] },
          { entryId: "entry-lunch-1", mealType: LogMealType.LUNCH, label: "Lunch", recipes: [] },
          { entryId: "entry-snack-1", mealType: LogMealType.SNACK, label: "Snack", recipes: [] },
          { entryId: "entry-dinner-1", mealType: LogMealType.DINNER, label: "Dinner", recipes: [] },
        ],
      },
      {
        date: new Date("2026-03-18T00:00:00.000Z"),
        dateKey: "2026-03-18",
        slots: [
          { entryId: "entry-breakfast-2", mealType: LogMealType.BREAKFAST, label: "Breakfast", recipes: [] },
          { entryId: "entry-lunch-2", mealType: LogMealType.LUNCH, label: "Lunch", recipes: [] },
          { entryId: "entry-snack-2", mealType: LogMealType.SNACK, label: "Snack", recipes: [] },
          { entryId: "entry-dinner-2", mealType: LogMealType.DINNER, label: "Dinner", recipes: [] },
        ],
      },
    ];

    render(<LogDayView days={days} logId="log-1" person="PRIMARY" />);
    await user.click(screen.getAllByRole("button", { name: /remove day/i })[0]!);

    expect(screen.getByText(/delete day and synced plan meals/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /delete day/i }));

    await waitFor(() => {
      expect(removeLogDayActionMock).toHaveBeenNthCalledWith(2, {
        logId: "log-1",
        dateKey: "2026-03-17",
        force: true,
      });
    });
  });

  it("renders empty slot with add entry CTA", () => {
    const days: LogDayData[] = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        dateKey: "2026-03-17",
        slots: [
          {
            mealType: LogMealType.BREAKFAST,
            label: "Breakfast",
            recipes: [],
          },
          {
            mealType: LogMealType.LUNCH,
            label: "Lunch",
            recipes: [],
          },
          {
            mealType: LogMealType.SNACK,
            label: "Snack",
            recipes: [],
          },
          {
            mealType: LogMealType.DINNER,
            label: "Dinner",
            recipes: [],
          },
        ],
      },
    ];

    render(<LogDayView days={days} />);

    expect(screen.getByText("Add snack entry")).toBeInTheDocument();
    expect(
      screen.getAllByText("Click to choose recipe or add ingredients").length,
    ).toBeGreaterThan(0);
  });

  it("renders slot list without mobile accordion controls", () => {
    const days: LogDayData[] = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        dateKey: "2026-03-17",
        slots: [
          {
            entryId: "entry-breakfast",
            mealType: LogMealType.BREAKFAST,
            label: "Breakfast",
            recipes: [],
          },
          {
            entryId: "entry-lunch",
            mealType: LogMealType.LUNCH,
            label: "Lunch",
            recipes: [],
          },
          {
            entryId: "entry-snack",
            mealType: LogMealType.SNACK,
            label: "Snack",
            recipes: [],
          },
          {
            entryId: "entry-dinner",
            mealType: LogMealType.DINNER,
            label: "Dinner",
            recipes: [],
          },
        ],
      },
    ];

    render(
      <LogDayView
        days={days}
        logId="log-1"
        person="PRIMARY"
        ingredientOptions={[]}
      />,
    );

    // Without accordion controls, each empty slot CTA appears once.
    expect(
      screen.getAllByRole("button", { name: /add breakfast entry/i }).length,
    ).toBe(1);
    expect(
      screen.getAllByRole("button", { name: /add lunch entry/i }).length,
    ).toBe(1);
    expect(
      screen.getAllByRole("button", { name: /add snack entry/i }).length,
    ).toBe(1);
    expect(
      screen.getAllByRole("button", { name: /add dinner entry/i }).length,
    ).toBe(1);
  });

  it("renders ingredient editor inline when empty slot card is clicked", async () => {
    const user = userEvent.setup();
    const days: LogDayData[] = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        dateKey: "2026-03-17",
        slots: [
          {
            entryId: "entry-breakfast",
            mealType: LogMealType.BREAKFAST,
            label: "Breakfast",
            recipes: [],
          },
          {
            entryId: "entry-lunch",
            mealType: LogMealType.LUNCH,
            label: "Lunch",
            recipes: [],
          },
          {
            entryId: "entry-snack",
            mealType: LogMealType.SNACK,
            label: "Snack",
            recipes: [],
          },
          {
            entryId: "entry-dinner",
            mealType: LogMealType.DINNER,
            label: "Dinner",
            recipes: [],
          },
        ],
      },
    ];

    render(
      <LogDayView
        days={days}
        logId="log-1"
        person="PRIMARY"
        recipeOptions={[
          { id: "recipe-1", name: "Banana pancakes", initialRows: [] },
        ]}
        ingredientOptions={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /add snack entry/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getAllByText("Snack").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Recipe (optional)").length).toBeGreaterThan(0);
  });

  it('does not show Create "..." when creation is unavailable', async () => {
    const user = userEvent.setup();
    const days: LogDayData[] = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        dateKey: "2026-03-17",
        slots: [
          {
            entryId: "entry-breakfast",
            mealType: LogMealType.BREAKFAST,
            label: "Breakfast",
            recipes: [],
          },
          {
            entryId: "entry-lunch",
            mealType: LogMealType.LUNCH,
            label: "Lunch",
            recipes: [],
          },
          {
            entryId: "entry-snack",
            mealType: LogMealType.SNACK,
            label: "Snack",
            recipes: [],
          },
          {
            entryId: "entry-dinner",
            mealType: LogMealType.DINNER,
            label: "Dinner",
            recipes: [],
          },
        ],
      },
    ];

    render(
      <LogDayView
        days={days}
        logId="log-1"
        person="PRIMARY"
        ingredientOptions={[
          {
            id: "ingredient-1",
            name: "Oats",
            brand: null,
            defaultUnitId: "unit-g",
            calories: 380,
            proteins: 13,
            fats: 7,
            carbs: 68,
            unitConversions: [
              {
                unitId: "unit-g",
                gramsPerUnit: 1,
                unitName: "g",
                unitNamePlural: null,
              },
            ],
          },
        ]}
        ingredientFormDependencies={ingredientFormDependencies}
      />,
    );

    await user.click(screen.getByRole("button", { name: /add snack entry/i }));
    await user.click(
      screen.getAllByRole("button", { name: /add ingredient/i })[0]!,
    );
    const ingredientCombobox = screen
      .getAllByRole("combobox")
      .find((element) =>
        element.textContent?.toLowerCase().includes("select ingredient"),
      );
    expect(ingredientCombobox).toBeDefined();
    await user.click(ingredientCombobox!);
    await user.type(
      screen.getByPlaceholderText("Search ingredient..."),
      "cottage chee",
    );

    expect(screen.queryByText('Create "cottage chee"')).not.toBeInTheDocument();
  });

  it("keeps inline editor context stable while searching ingredients", async () => {
    const user = userEvent.setup();
    const days: LogDayData[] = [
      {
        date: new Date("2026-03-17T00:00:00.000Z"),
        dateKey: "2026-03-17",
        slots: [
          {
            entryId: "entry-breakfast",
            mealType: LogMealType.BREAKFAST,
            label: "Breakfast",
            recipes: [],
          },
          {
            entryId: "entry-lunch",
            mealType: LogMealType.LUNCH,
            label: "Lunch",
            recipes: [],
          },
          {
            entryId: "entry-snack",
            mealType: LogMealType.SNACK,
            label: "Snack",
            recipes: [],
          },
          {
            entryId: "entry-dinner",
            mealType: LogMealType.DINNER,
            label: "Dinner",
            recipes: [],
          },
        ],
      },
    ];

    render(
      <LogDayView
        days={days}
        logId="log-1"
        person="PRIMARY"
        ingredientOptions={[]}
        ingredientFormDependencies={ingredientFormDependencies}
      />,
    );

    await user.click(screen.getByRole("button", { name: /add snack entry/i }));
    await user.click(
      screen.getAllByRole("button", { name: /add ingredient/i })[0]!,
    );
    const ingredientCombobox = screen
      .getAllByRole("combobox")
      .find((element) =>
        element.textContent?.toLowerCase().includes("select ingredient"),
      );
    expect(ingredientCombobox).toBeDefined();
    await user.click(ingredientCombobox!);
    await user.type(
      screen.getByPlaceholderText("Search ingredient..."),
      "cottage chee",
    );
    expect(screen.queryByText('Create "cottage chee"')).not.toBeInTheDocument();
    expect(screen.getAllByText("Snack").length).toBeGreaterThan(0);
  });
});
