import { render, screen } from "@testing-library/react";
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
});
