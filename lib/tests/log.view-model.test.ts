import { describe, expect, it } from "vitest";
import { LogMealType } from "@/src/generated/enums";
import { buildLogDays } from "@/lib/log/view-model";

const gramsUnit = { id: "unit-grams", name: "grams" };

describe("buildLogDays", () => {
  it("groups entries by day and enforces Breakfast/Lunch/Snack/Dinner slot order", () => {
    const days = buildLogDays([
      {
        id: "entry-lunch",
        date: new Date("2026-03-17T00:00:00.000Z"),
        mealType: LogMealType.LUNCH,
        recipes: [
          {
            id: "entry-recipe-lunch",
            sourceRecipe: { name: "Chicken Bowl", slug: "chicken-bowl", images: [] },
          },
        ],
        ingredients: [
          {
            entryRecipeId: "entry-recipe-lunch",
            amount: 100,
            unit: gramsUnit,
            ingredient: {
              id: "ing-lunch",
              name: "Lunch ingredient",
              calories: 200,
              proteins: 20,
              fats: 10,
              carbs: 5,
              unitConversions: [{ unitId: "unit-grams", gramsPerUnit: 1 }],
            },
          },
        ],
      },
      {
        id: "entry-breakfast",
        date: new Date("2026-03-17T00:00:00.000Z"),
        mealType: LogMealType.BREAKFAST,
        recipes: [
          {
            id: "entry-recipe-breakfast",
            sourceRecipe: { name: "Oatmeal", slug: "oatmeal", images: [] },
          },
        ],
        ingredients: [
          {
            entryRecipeId: "entry-recipe-breakfast",
            amount: 50,
            unit: gramsUnit,
            ingredient: {
              id: "ing-breakfast",
              name: "Breakfast ingredient",
              calories: 350,
              proteins: 12,
              fats: 7,
              carbs: 60,
              unitConversions: [{ unitId: "unit-grams", gramsPerUnit: 1 }],
            },
          },
        ],
      },
      {
        id: "entry-snack",
        date: new Date("2026-03-17T00:00:00.000Z"),
        mealType: LogMealType.SNACK,
        recipes: [],
        ingredients: [],
      },
    ]);

    expect(days).toHaveLength(1);
    expect(days[0]?.slots.map((slot) => slot.mealType)).toEqual([
      LogMealType.BREAKFAST,
      LogMealType.LUNCH,
      LogMealType.SNACK,
      LogMealType.DINNER,
    ]);
  });

  it("computes per-recipe macros from ingredients linked by entryRecipeId", () => {
    const days = buildLogDays([
      {
        id: "entry-breakfast",
        date: new Date("2026-03-18T00:00:00.000Z"),
        mealType: LogMealType.BREAKFAST,
        recipes: [
          {
            id: "entry-recipe-a",
            sourceRecipe: { name: "Recipe A", slug: "recipe-a", images: [] },
          },
          {
            id: "entry-recipe-b",
            sourceRecipe: null,
          },
        ],
        ingredients: [
          {
            entryRecipeId: "entry-recipe-a",
            amount: 100,
            unit: gramsUnit,
            ingredient: {
              id: "ing-a",
              name: "Ingredient A",
              calories: 100,
              proteins: 10,
              fats: 5,
              carbs: 2,
              unitConversions: [{ unitId: "unit-grams", gramsPerUnit: 1 }],
            },
          },
          {
            entryRecipeId: "entry-recipe-b",
            amount: 50,
            unit: gramsUnit,
            ingredient: {
              id: "ing-b",
              name: "Ingredient B",
              calories: 200,
              proteins: 30,
              fats: 20,
              carbs: 10,
              unitConversions: [{ unitId: "unit-grams", gramsPerUnit: 1 }],
            },
          },
          {
            entryRecipeId: null,
            amount: 20,
            unit: gramsUnit,
            ingredient: {
              id: "ing-null",
              name: "Ingredient Null",
              calories: 999,
              proteins: 999,
              fats: 999,
              carbs: 999,
              unitConversions: [{ unitId: "unit-grams", gramsPerUnit: 1 }],
            },
          },
        ],
      },
    ]);

    const breakfastRecipes = days[0]?.slots[0]?.recipes ?? [];
    expect(breakfastRecipes).toHaveLength(2);

    expect(breakfastRecipes[0]).toMatchObject({
      title: "Recipe A",
      calories: 100,
      proteins: 10,
      fats: 5,
      carbs: 2,
    });

    expect(breakfastRecipes[1]).toMatchObject({
      title: "Recipe removed",
      calories: 100,
      proteins: 15,
      fats: 10,
      carbs: 5,
    });
  });
});
