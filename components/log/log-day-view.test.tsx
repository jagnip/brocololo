import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LogMealType } from "@/src/generated/enums";
import { LogDayView } from "./log-day-view";
import type { LogDayData } from "@/lib/log/view-model";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  // Cmdk-based selects rely on ResizeObserver in jsdom tests.
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

if (!HTMLElement.prototype.scrollIntoView) {
  // Cmdk attempts to scroll highlighted options into view.
  HTMLElement.prototype.scrollIntoView = () => {};
}

const ingredientFormDependencies = {
  categories: [{ id: "cat-dairy", name: "Dairy" }],
  units: [{ id: "unit-g", name: "g", namePlural: null }],
  gramsUnitId: "unit-g",
  iconOptions: [],
};

describe("LogDayView", () => {
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

    expect(screen.getByText("Breakfast")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(screen.getByText("Snack")).toBeInTheDocument();
    expect(screen.getByText("Dinner")).toBeInTheDocument();

    expect(screen.getByText("Oatmeal")).toBeInTheDocument();
    expect(screen.getByText("Chicken Bowl")).toBeInTheDocument();
    expect(screen.getByText("Salmon Rice")).toBeInTheDocument();
    expect(screen.getByText("1750 kcal")).toBeInTheDocument();
    expect(screen.getByText("115.0g protein")).toBeInTheDocument();
    expect(screen.getByText("57.0g fat")).toBeInTheDocument();
    expect(screen.getByText("164.0g carbs")).toBeInTheDocument();
    expect(screen.queryByText("Snack: empty")).not.toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /yogurt with frozen fruits and nuts/i }),
    ).toBeInTheDocument();
  });

  it("opens ingredient editor dialog when recipe card is clicked", async () => {
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

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Breakfast")).toBeInTheDocument();
    expect(within(dialog).getByText("Recipe (optional)")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /add ingredient/i })).toBeInTheDocument();
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

  it("opens ingredient editor dialog when empty slot card is clicked", async () => {
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
        recipeOptions={[{ id: "recipe-1", name: "Banana pancakes", initialRows: [] }]}
        ingredientOptions={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /add snack entry/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Snack")).toBeInTheDocument();
    expect(within(dialog).getByText("Recipe (optional)")).toBeInTheDocument();
  });

  it('shows Create "..." in ingredient selector when search has no exact match', async () => {
    const user = userEvent.setup();
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
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /add ingredient/i }));
    const ingredientCombobox = within(dialog)
      .getAllByRole("combobox")
      .find((element) =>
        element.textContent?.toLowerCase().includes("select ingredient"),
      );
    expect(ingredientCombobox).toBeDefined();
    await user.click(ingredientCombobox!);
    await user.type(screen.getByPlaceholderText("Search ingredient..."), "cottage chee");

    expect(screen.getByText('Create "cottage chee"')).toBeInTheDocument();
  });

  it("opens create ingredient dialog from log flow and keeps parent dialog context", async () => {
    const user = userEvent.setup();
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
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /add ingredient/i }));
    const ingredientCombobox = within(dialog)
      .getAllByRole("combobox")
      .find((element) =>
        element.textContent?.toLowerCase().includes("select ingredient"),
      );
    expect(ingredientCombobox).toBeDefined();
    await user.click(ingredientCombobox!);
    await user.type(screen.getByPlaceholderText("Search ingredient..."), "cottage chee");
    await user.click(screen.getByText('Create "cottage chee"'));

    expect(
      screen.getByText("Add a missing ingredient without leaving your current flow."),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Snack")).toBeInTheDocument();
  });
});
