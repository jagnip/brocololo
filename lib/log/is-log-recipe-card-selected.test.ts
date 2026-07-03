import { describe, expect, it } from "vitest";
import { LogMealType } from "@/src/generated/enums";
import { toPlanIdeaMealOptionId, toRepositoryMealOptionId } from "@/lib/log/meal-selector-options";
import { isLogRecipeCardSelected } from "@/lib/log/is-log-recipe-card-selected";
import type { LogRecipeCardData, LogSlotData } from "@/lib/log/view-model";

const slot: LogSlotData = {
  entryId: "entry-1",
  mealType: LogMealType.BREAKFAST,
  label: "Breakfast",
  recipes: [],
};

describe("isLogRecipeCardSelected", () => {
  it("matches repository recipes by namespaced meal option id", () => {
    const recipe: LogRecipeCardData = {
      id: "ler-1",
      entryId: "entry-1",
      entryRecipeId: "ler-1",
      sourceRecipeId: "recipe-1",
      mealLabel: "Breakfast",
      cardKind: "recipe",
      title: "Chicken curry",
      slug: null,
      imageUrl: null,
      calories: 0,
      proteins: 0,
      fats: 0,
      carbs: 0,
    };

    expect(
      isLogRecipeCardSelected(
        {
          dayKey: "2026-03-17",
          mealType: LogMealType.BREAKFAST,
          entryRecipeId: "ler-1",
          selectedMealOptionId: toRepositoryMealOptionId("recipe-1"),
        },
        "2026-03-17",
        slot,
        recipe,
      ),
    ).toBe(true);
  });

  it("matches plan idea meals by custom name option id", () => {
    const recipe: LogRecipeCardData = {
      id: "ler-2",
      entryId: "entry-1",
      entryRecipeId: "ler-2",
      sourceRecipeId: null,
      planSlotId: "slot-1",
      planIdeaCustomName: "Pasta from insta",
      mealLabel: "Breakfast",
      cardKind: "custom",
      title: "Pasta from insta",
      slug: null,
      imageUrl: null,
      calories: 0,
      proteins: 0,
      fats: 0,
      carbs: 0,
    };

    expect(
      isLogRecipeCardSelected(
        {
          dayKey: "2026-03-17",
          mealType: LogMealType.BREAKFAST,
          entryRecipeId: "ler-2",
          selectedMealOptionId: toPlanIdeaMealOptionId("Pasta from insta"),
        },
        "2026-03-17",
        slot,
        recipe,
      ),
    ).toBe(true);
  });
});
