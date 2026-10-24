import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IngredientNutritionalInfo } from "./ingredient-nutritional-info";

describe("IngredientNutritionalInfo", () => {
  it("orders nutrition as calories, fat, carbs, protein for every amount", () => {
    render(
      <IngredientNutritionalInfo
        isOpen
        nutrition={{ calories: 100, fat: 5, carbs: 20, protein: 10 }}
        oneUnitHeader="1 unit"
        selectedAmountHeader="Selected amount"
        oneSelectedUnitNutrition={{ calories: 200, fat: 10, carbs: 40, protein: 20 }}
        selectedAmountNutrition={{ calories: 300, fat: 15, carbs: 60, protein: 30 }}
      />,
    );

    const rows = screen.getAllByRole("row").slice(1);
    expect(
      rows.map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent)),
    ).toEqual([
      ["Calories", "100 kcal", "200 kcal", "300 kcal"],
      ["Fat", "5g", "10g", "15g"],
      ["Carbs", "20g", "40g", "60g"],
      ["Protein", "10g", "20g", "30g"],
    ]);
  });
});
