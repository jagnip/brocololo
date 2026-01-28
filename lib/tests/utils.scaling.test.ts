import { describe, expect, it } from "vitest";
import { calculateServingScalingFactor } from "../recipes/helpers";

describe("calculateServingScalingFactor canonical recipe model", () => {
  it("scales ingredients linearly by currentServings / recipeServings", () => {
    const result = calculateServingScalingFactor(4, 2, 2);

    // Saved amounts already include Nelson's multiplier, so this is a plain ratio.
    expect(result.servingScalingFactor).toBe(2);
  });

  it("returns stable Jagoda/Nelson split independent of current servings", () => {
    const a = calculateServingScalingFactor(2, 2, 2);
    const b = calculateServingScalingFactor(8, 2, 2);

    expect(a.jagodaPortionFactor).toBeCloseTo(1 / 3, 5);
    expect(a.nelsonPortionFactor).toBeCloseTo(2 / 3, 5);
    expect(b.jagodaPortionFactor).toBeCloseTo(1 / 3, 5);
    expect(b.nelsonPortionFactor).toBeCloseTo(2 / 3, 5);
  });

  it("keeps portion factors normalized", () => {
    const result = calculateServingScalingFactor(6, 4, 1.5);

    expect(result.jagodaPortionFactor + result.nelsonPortionFactor).toBeCloseTo(
      1,
      8,
    );
  });

  it("matches chicken sandwiches example", () => {
    // Example: 300g chicken, servings=2, multiplier=2.
    // Jagoda gets 1/3 per meal and Nelson 2/3 per meal.
    const result = calculateServingScalingFactor(2, 2, 2);
    const totalChicken = 300;
    const jagodaChicken = totalChicken * result.jagodaPortionFactor;
    const nelsonChicken = totalChicken * result.nelsonPortionFactor;

    expect(jagodaChicken).toBeCloseTo(100, 5);
    expect(nelsonChicken).toBeCloseTo(200, 5);
  });

  it("scales down correctly when current servings are lower", () => {
    const result = calculateServingScalingFactor(2, 6, 1.5);
    expect(result.servingScalingFactor).toBeCloseTo(2 / 6, 8);
  });

  it("scales up correctly when current servings are higher", () => {
    const result = calculateServingScalingFactor(10, 2, 1.5);
    expect(result.servingScalingFactor).toBeCloseTo(5, 8);
  });
});
