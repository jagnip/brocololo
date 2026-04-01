import { describe, expect, it } from "vitest";
import { LogMealType } from "@/src/generated/enums";
import {
  buildLogDays,
  buildVisiblePlannerPoolCards,
} from "@/lib/log/view-model";

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
            sourceRecipe: {
              id: "recipe-lunch",
              name: "Chicken Bowl",
              slug: "chicken-bowl",
              images: [],
            },
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
            sourceRecipe: {
              id: "recipe-breakfast",
              name: "Oatmeal",
              slug: "oatmeal",
              images: [],
            },
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
            sourceRecipe: {
              id: "recipe-a",
              name: "Recipe A",
              slug: "recipe-a",
              images: [],
            },
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
        ],
      },
    ]);

    const breakfastRecipes = days[0]?.slots[0]?.recipes ?? [];
    expect(breakfastRecipes).toHaveLength(2);

    expect(breakfastRecipes[0]).toMatchObject({
      cardKind: "recipe",
      title: "Recipe A",
      calories: 100,
      proteins: 10,
      fats: 5,
      carbs: 2,
    });

    expect(breakfastRecipes[1]).toMatchObject({
      cardKind: "removed",
      title: "Recipe removed",
      calories: 100,
      proteins: 15,
      fats: 10,
      carbs: 5,
    });
  });

  it("creates custom card from ingredients without entryRecipeId", () => {
    const days = buildLogDays([
      {
        id: "entry-snack",
        date: new Date("2026-03-19T00:00:00.000Z"),
        mealType: LogMealType.SNACK,
        recipes: [],
        ingredients: [
          {
            entryRecipeId: null,
            amount: 100,
            unit: gramsUnit,
            ingredient: {
              id: "ing-custom",
              name: "Yogurt",
              calories: 120,
              proteins: 8,
              fats: 4,
              carbs: 10,
              unitConversions: [{ unitId: "unit-grams", gramsPerUnit: 1 }],
            },
          },
        ],
      },
    ]);

    const snackRecipes = days[0]?.slots[2]?.recipes ?? [];
    expect(snackRecipes).toHaveLength(1);
    expect(snackRecipes[0]).toMatchObject({
      cardKind: "custom",
      title: "Custom snack",
      calories: 120,
      proteins: 8,
      fats: 4,
      carbs: 10,
    });
  });
});

describe("buildVisiblePlannerPoolCards", () => {
  const poolItem = (id: string, recipeId: string) => ({
    id,
    date: new Date("2026-03-30T00:00:00.000Z"),
    dateKey: "2026-03-30",
    mealType: LogMealType.DINNER,
    mealLabel: "Dinner" as const,
    title: "Red cabbage",
    sourceRecipeId: recipeId,
    imageUrl: null,
    ingredients: [] as Array<{
      ingredientId: string;
      unitId: string;
      amount: number;
    }>,
  });

  it("hides one pool card per plan-linked log recipe, not per manual recipe", () => {
    const items = [poolItem("p1", "rec-a"), poolItem("p2", "rec-a")];
    const entries = [
      {
        id: "e1",
        date: new Date("2026-03-30T00:00:00.000Z"),
        mealType: LogMealType.LUNCH,
        recipes: [
          {
            id: "er-manual",
            planSlotId: null,
            sourceRecipe: {
              id: "rec-a",
              name: "Red cabbage",
              slug: "rc",
              images: [],
            },
          },
        ],
        ingredients: [],
      },
    ];

    const visible = buildVisiblePlannerPoolCards({ items, entries });
    expect(visible).toHaveLength(2);
  });

  it("does not subtract pool lines by log placements (planner used-state is source of truth)", () => {
    const items = [poolItem("p1", "rec-a"), poolItem("p2", "rec-a")];
    const entries = [
      {
        id: "e1",
        date: new Date("2026-03-30T00:00:00.000Z"),
        mealType: LogMealType.LUNCH,
        recipes: [
          {
            id: "er-pool",
            planSlotId: "slot-1",
            sourceRecipe: {
              id: "rec-a",
              name: "Red cabbage",
              slug: "rc",
              images: [],
            },
          },
        ],
        ingredients: [],
      },
    ];

    const visible = buildVisiblePlannerPoolCards({ items, entries });
    expect(visible).toHaveLength(2);
    expect(visible.map((item) => item.id)).toEqual(["p1", "p2"]);
  });
});
