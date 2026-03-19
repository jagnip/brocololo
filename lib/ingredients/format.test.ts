import { describe, expect, it } from "vitest";
import { getIngredientDisplayName } from "./format";

describe("getIngredientDisplayName", () => {
  it("returns name with brand in parentheses", () => {
    expect(getIngredientDisplayName("Chicken Breast", "Lidl")).toBe(
      "Chicken Breast (Lidl)",
    );
  });

  it("returns just name when brand is null", () => {
    expect(getIngredientDisplayName("Chicken Breast", null)).toBe(
      "Chicken Breast",
    );
  });
});
