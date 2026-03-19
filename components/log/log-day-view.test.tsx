import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LogMealType } from "@/src/generated/enums";
import { LogDayView } from "./log-day-view";
import type { LogDayData } from "@/lib/log/view-model";

describe("LogDayView", () => {
  it("renders all four slots and keeps snack empty", () => {
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
            recipes: [],
          },
          {
            mealType: LogMealType.DINNER,
            label: "Dinner",
            recipes: [
              {
                id: "r3",
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

    expect(screen.getByText("Snack: empty")).toBeInTheDocument();
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

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add ingredient/i })).toBeInTheDocument();
  });
});
