import { describe, expect, it } from "vitest";
import { calculateServingScalingFactor } from "../recipes/helpers";

describe("calculateServingScalingFactor", () => {
  it("scales ingredients linearly by currentServings / recipeServings", () => {
    const result = calculateServingScalingFactor(4, 2);

    expect(result.servingScalingFactor).toBe(2);
  });

  it("scales down correctly when current servings are lower", () => {
    const result = calculateServingScalingFactor(2, 6);
    expect(result.servingScalingFactor).toBeCloseTo(2 / 6, 8);
  });

  it("scales up correctly when current servings are higher", () => {
    const result = calculateServingScalingFactor(10, 2);
    expect(result.servingScalingFactor).toBeCloseTo(5, 8);
  });
});
