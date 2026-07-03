import { describe, expect, it } from "vitest";
import {
  buildLogMealSelectorOptions,
  mealOptionIdFromRecipeCard,
  parseMealOptionId,
  toPlanIdeaMealOptionId,
  toRepositoryMealOptionId,
  toUpsertLogSlotMealSelection,
} from "@/lib/log/meal-selector-options";

describe("meal selector option ids", () => {
  it("round-trips repository and plan idea ids", () => {
    expect(parseMealOptionId(toRepositoryMealOptionId("recipe-1"))).toEqual({
      kind: "repository",
      recipeId: "recipe-1",
    });
    expect(
      parseMealOptionId(toPlanIdeaMealOptionId("Pasta from insta")),
    ).toEqual({
      kind: "plan-idea",
      customName: "Pasta from insta",
    });
  });

  it("maps selector values to upsert payload fields", () => {
    expect(
      toUpsertLogSlotMealSelection({
        selectedMealOptionId: toRepositoryMealOptionId("recipe-1"),
        planSlotId: null,
      }),
    ).toEqual({
      recipeId: "recipe-1",
      planIdeaCustomName: null,
      planSlotId: null,
    });

    expect(
      toUpsertLogSlotMealSelection({
        selectedMealOptionId: toPlanIdeaMealOptionId("Pasta from insta"),
        planSlotId: "slot-1",
      }),
    ).toEqual({
      recipeId: null,
      planIdeaCustomName: "Pasta from insta",
      planSlotId: "slot-1",
    });
  });

  it("resolves meal option id from logged recipe cards", () => {
    expect(
      mealOptionIdFromRecipeCard({
        sourceRecipeId: "recipe-1",
        planIdeaCustomName: null,
      }),
    ).toBe(toRepositoryMealOptionId("recipe-1"));

    expect(
      mealOptionIdFromRecipeCard({
        sourceRecipeId: null,
        planIdeaCustomName: "Pasta from insta",
      }),
    ).toBe(toPlanIdeaMealOptionId("Pasta from insta"));
  });
});

describe("buildLogMealSelectorOptions", () => {
  it("includes repository recipes and unique plan idea names", () => {
    const options = buildLogMealSelectorOptions({
      recipes: [
        {
          id: "recipe-1",
          name: "Chicken curry",
          ingredients: [],
          servings: 2,
          memberPortions: [],
          audienceMembers: [],
        },
      ] as never,
      planSlots: [
        {
          id: "slot-1",
          recipe: null,
          customMeal: {
            name: "Pasta from insta",
            ingredients: [
              {
                ingredientId: "ing-1",
                unitId: "unit-g",
                amount: 100,
              },
            ],
          },
        },
        {
          id: "slot-2",
          recipe: null,
          customMeal: {
            name: "Pasta from insta",
            ingredients: [],
          },
        },
      ] as never,
      familyMemberId: "member-1",
      familyMembers: [
        { id: "member-1", name: "You", isSelf: true, sortOrder: 0 },
      ] as never,
    });

    expect(options).toHaveLength(2);
    expect(options[0]).toMatchObject({
      id: toRepositoryMealOptionId("recipe-1"),
      name: "Chicken curry",
      kind: "repository",
    });
    expect(options[1]).toMatchObject({
      id: toPlanIdeaMealOptionId("Pasta from insta"),
      name: "Pasta from insta",
      kind: "plan-idea",
      initialRows: [
        { ingredientId: "ing-1", unitId: "unit-g", amount: 100 },
      ],
    });
  });
});
