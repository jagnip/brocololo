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
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Family member")).toBeInTheDocument();
    expect(screen.getByText("100 kcal")).toBeInTheDocument();
    expect(screen.getByText("200 kcal")).toBeInTheDocument();
    expect(screen.getByText("10g protein")).toBeInTheDocument();
    expect(screen.getByText("5g fat")).toBeInTheDocument();
    expect(screen.getByText("20g carbs")).toBeInTheDocument();
    expect(screen.getByText("12g protein")).toBeInTheDocument();
    expect(screen.getByText("6g fat")).toBeInTheDocument();
    expect(screen.getByText("22g carbs")).toBeInTheDocument();
    for (const expectedOrder of [
      ["100 kcal", "5g fat", "20g carbs", "10g protein"],
      ["200 kcal", "6g fat", "22g carbs", "12g protein"],
    ]) {
      const badges = screen.getByText(expectedOrder[0]).parentElement!.children;
      expect(Array.from(badges, (badge) => badge.textContent)).toEqual(expectedOrder);
    }
    expect(
      screen.getByLabelText("Estimated nutrition preview by person"),
    ).toHaveAttribute("aria-live", "polite");
  });
});
