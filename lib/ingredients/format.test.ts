import { describe, expect, it } from "vitest";
import { getIngredientDisplayName, getIngredientTitleParts } from "./format";

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

  it("returns name with descriptor before brand", () => {
    expect(getIngredientDisplayName("Edamame", "Tesco", "frozen")).toBe(
      "Edamame (frozen) (Tesco)",
    );
  });

  it("returns title parts for styled display", () => {
    expect(
      getIngredientTitleParts({
        name: "Chicken thighs",
        descriptor: "skinless",
      }),
    ).toEqual({
      name: "Chicken thighs",
      descriptor: "(skinless)",
      brand: null,
    });
  });
});
