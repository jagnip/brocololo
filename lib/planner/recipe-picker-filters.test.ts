import { describe, expect, it } from "vitest";
import {
  filterRecipes,
  getOccasionOptions,
  PLANNER_MEAL_TYPE_TO_OCCASION_SLUG,
} from "./recipe-picker-filters";
import type { RecipeType } from "@/types/recipe";

function makeRecipe(
  overrides: Partial<RecipeType> & {
    id: string;
    name: string;
    handsOnTime: number;
    categories?: RecipeType["categories"];
  },
): RecipeType {
  return {
    slug: overrides.id,
    servings: 2,
    plannedMealCount: 1,
    isBatchRecipe: false,
    totalTime: overrides.handsOnTime,
    images: [],
    ingredientGroups: [],
    ingredients: [],
    instructions: [],
    audienceMembers: [],
    memberPortions: [],
    categories: overrides.categories ?? [],
    ...overrides,
  } as RecipeType;
}

const breakfast = {
  id: "cat-breakfast",
  slug: "breakfast",
  name: "Breakfast",
  type: "MEAL_OCCASION" as const,
};
const lunch = {
  id: "cat-lunch",
  slug: "lunch",
  name: "Lunch",
  type: "MEAL_OCCASION" as const,
};
const dinner = {
  id: "cat-dinner",
  slug: "dinner",
  name: "Dinner",
  type: "MEAL_OCCASION" as const,
};
const chicken = {
  id: "cat-chicken",
  slug: "chicken",
  name: "Chicken",
  type: "PROTEIN" as const,
};

const recipes = [
  makeRecipe({
    id: "1",
    name: "Overnight Oats",
    handsOnTime: 10,
    categories: [breakfast],
  }),
  makeRecipe({
    id: "2",
    name: "Tuna Melt",
    handsOnTime: 25,
    categories: [lunch, chicken],
  }),
  makeRecipe({
    id: "3",
    name: "Pasta Carbonara",
    handsOnTime: 40,
    categories: [dinner],
  }),
  makeRecipe({
    id: "4",
    name: "Scrambled Eggs",
    handsOnTime: 15,
    categories: [breakfast, lunch],
  }),
];

describe("PLANNER_MEAL_TYPE_TO_OCCASION_SLUG", () => {
  it("maps each planner meal type to its occasion slug", () => {
    expect(PLANNER_MEAL_TYPE_TO_OCCASION_SLUG.BREAKFAST).toBe("breakfast");
    expect(PLANNER_MEAL_TYPE_TO_OCCASION_SLUG.LUNCH).toBe("lunch");
    expect(PLANNER_MEAL_TYPE_TO_OCCASION_SLUG.DINNER).toBe("dinner");
  });
});

describe("getOccasionOptions", () => {
  it("returns distinct MEAL_OCCASION categories in canonical order", () => {
    expect(getOccasionOptions(recipes)).toEqual([
      { slug: "breakfast", name: "Breakfast" },
      { slug: "lunch", name: "Lunch" },
      { slug: "dinner", name: "Dinner" },
    ]);
  });

  it("ignores non-occasion categories", () => {
    const onlyProtein = [
      makeRecipe({
        id: "p",
        name: "Protein only",
        handsOnTime: 5,
        categories: [chicken],
      }),
    ];
    expect(getOccasionOptions(onlyProtein)).toEqual([]);
  });
});

describe("filterRecipes", () => {
  it("filters by case-insensitive name search", () => {
    const result = filterRecipes(recipes, { search: "tuna" });
    expect(result.map((r) => r.id)).toEqual(["2"]);
  });

  it("matches only MEAL_OCCASION categories for occasion filter", () => {
    // Chicken is a PROTEIN on Tuna Melt — occasion "chicken" must not match.
    expect(
      filterRecipes(recipes, { occasionSlug: "chicken" }).map((r) => r.id),
    ).toEqual([]);
    expect(
      filterRecipes(recipes, { occasionSlug: "lunch" }).map((r) => r.id),
    ).toEqual(["4", "2"]);
  });

  it("applies inclusive hands-on time ceiling", () => {
    expect(
      filterRecipes(recipes, { handsOnTimeMax: 15 }).map((r) => r.id),
    ).toEqual(["1", "4"]);
    expect(
      filterRecipes(recipes, { handsOnTimeMax: 25 }).map((r) => r.id),
    ).toEqual(["1", "4", "2"]);
  });

  it("sorts by handsOnTime ascending", () => {
    expect(filterRecipes(recipes, {}).map((r) => r.id)).toEqual([
      "1",
      "4",
      "2",
      "3",
    ]);
  });

  it("intersects combined filters", () => {
    expect(
      filterRecipes(recipes, {
        search: "e",
        occasionSlug: "breakfast",
        handsOnTimeMax: 15,
      }).map((r) => r.id),
    ).toEqual(["1", "4"]);
  });
});
