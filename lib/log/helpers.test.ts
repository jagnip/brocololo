import { describe, expect, it } from "vitest";
import { getPersonIngredientAmountPerMeal } from "@/lib/log/helpers";

describe("getPersonIngredientAmountPerMeal", () => {
  it("splits BOTH ingredients by serving multiplier", () => {
    // 300 total ingredient amount over 2 meals => 150 per meal baseline.
    const primary = getPersonIngredientAmountPerMeal({
      amount: 300,
      nutritionTarget: "BOTH",
      person: "primary",
      recipeServings: 4,
      servingMultiplierForNelson: 1.5,
    });
    const secondary = getPersonIngredientAmountPerMeal({
      amount: 300,
      nutritionTarget: "BOTH",
      person: "secondary",
      recipeServings: 4,
      servingMultiplierForNelson: 1.5,
    });

    // Split ratio is 1:1.5 => primary 60, secondary 90 for each meal.
    expect(primary).toBeCloseTo(60);
    expect(secondary).toBeCloseTo(90);
  });

  it("returns null for invalid servings", () => {
    const value = getPersonIngredientAmountPerMeal({
      amount: 100,
      nutritionTarget: "BOTH",
      person: "primary",
      recipeServings: 0,
      servingMultiplierForNelson: 1,
    });

    expect(value).toBeNull();
  });
});
