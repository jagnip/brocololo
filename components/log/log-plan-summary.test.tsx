import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LogMealType } from "@/src/generated/enums";
import type { LogDayData, LogSlotData } from "@/lib/log/view-model";
import { LogPlanSummary } from "./log-plan-summary";

function makeSlots(withBreakfast: boolean): LogSlotData[] {
  return [
    {
      mealType: LogMealType.BREAKFAST,
      label: "Breakfast",
      recipes: withBreakfast
        ? [
            {
              id: "breakfast-1",
              entryRecipeId: "breakfast-1",
              sourceRecipeId: "recipe-1",
              mealLabel: "Breakfast",
              cardKind: "recipe",
              title: "Oatmeal",
              slug: "oatmeal",
              imageUrl: null,
              calories: 450,
              proteins: 20,
              fats: 15,
              carbs: 60,
            },
          ]
        : [],
    },
    { mealType: LogMealType.LUNCH, label: "Lunch", recipes: [] },
    { mealType: LogMealType.SNACK, label: "Snack", recipes: [] },
    { mealType: LogMealType.DINNER, label: "Dinner", recipes: [] },
  ];
}

const days: LogDayData[] = [
  {
    date: new Date("2026-03-17T00:00:00.000Z"),
    dateKey: "2026-03-17",
    slots: makeSlots(true),
  },
  {
    date: new Date("2026-03-18T00:00:00.000Z"),
    dateKey: "2026-03-18",
    slots: makeSlots(false),
  },
];

describe("LogPlanSummary", () => {
  it("shows selected-person averages and every plan day", () => {
    render(<LogPlanSummary days={days} />);

    expect(screen.getAllByText("450 kcal")).toHaveLength(2);
    expect(screen.getByText("No entries")).toBeInTheDocument();
  });

  it("groups ingredient quantities under their recipe and keeps standalone ingredients separate", () => {
    const loggedDay: LogDayData = {
      ...days[0]!,
      slots: makeSlots(true),
    };
    loggedDay.slots[0]!.recipes[0]!.ingredients = [
      { ingredientId: "oats", ingredientName: "Oats", unitId: "g", unitName: "g", amount: 60 },
      { ingredientId: "milk", ingredientName: "Milk", unitId: "ml", unitName: "ml", amount: 200 },
    ];
    loggedDay.slots[2]!.recipes = [{
      ...loggedDay.slots[0]!.recipes[0]!,
      id: "custom-snack",
      entryRecipeId: null,
      sourceRecipeId: null,
      cardKind: "custom",
      title: "Custom snack",
      ingredients: [
        { ingredientId: "apple", ingredientName: "Apple", unitId: "piece", unitName: "piece", amount: 1 },
      ],
    }];

    render(<LogPlanSummary days={[loggedDay]} />);

    const recipeIngredients = screen.getByRole("list", { name: "Oatmeal ingredients", hidden: true });
    expect(within(recipeIngredients).getByText("Oats")).toBeInTheDocument();
    expect(within(recipeIngredients).getByText("60 g")).toBeInTheDocument();
    expect(within(recipeIngredients).getByText("Milk")).toBeInTheDocument();
    expect(within(recipeIngredients).getByText("200 ml")).toBeInTheDocument();
    expect(within(recipeIngredients).queryByText("Apple")).not.toBeInTheDocument();
    const standaloneIngredients = screen.getByRole("list", { name: "Snack ingredients without a recipe", hidden: true });
    expect(within(standaloneIngredients).getByText("Apple")).toBeInTheDocument();
    expect(within(standaloneIngredients).getByText("1 piece")).toBeInTheDocument();
    expect(screen.queryByText("Custom snack")).not.toBeInTheDocument();
    expect(screen.queryByText(/Planned meals still waiting/)).not.toBeInTheDocument();
  });
});
