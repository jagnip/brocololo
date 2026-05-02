import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecipeNutritionPreviewSection } from "./recipe-nutrition-preview-section";

describe("RecipeNutritionPreviewSection", () => {
  it("renders section title, person labels, and macro badges for both diners", () => {
    render(
      <RecipeNutritionPreviewSection
        jagoda={{ calories: 100, protein: 10, fat: 5, carbs: 20 }}
        nelson={{ calories: 200, protein: 12, fat: 6, carbs: 22 }}
      />,
    );

    expect(screen.getByText("Nutrition preview")).toBeInTheDocument();
    expect(screen.getByText("Jagoda")).toBeInTheDocument();
    expect(screen.getByText("Nelson")).toBeInTheDocument();
    expect(screen.getByText("100 kcal")).toBeInTheDocument();
    expect(screen.getByText("200 kcal")).toBeInTheDocument();
    expect(screen.getByText("10g protein")).toBeInTheDocument();
    expect(screen.getByText("5g fat")).toBeInTheDocument();
    expect(screen.getByText("20g carbs")).toBeInTheDocument();
    expect(screen.getByText("12g protein")).toBeInTheDocument();
    expect(screen.getByText("6g fat")).toBeInTheDocument();
    expect(screen.getByText("22g carbs")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Estimated nutrition preview by person"),
    ).toHaveAttribute("aria-live", "polite");
  });
});
