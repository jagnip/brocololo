import { describe, expect, it } from "vitest";
import { getProteinBadgeVariant } from "./protein-badge-variant";

describe("getProteinBadgeVariant", () => {
  it("maps poultry slugs to poultry", () => {
    expect(getProteinBadgeVariant("chicken")).toBe("poultry");
    expect(getProteinBadgeVariant("turkey")).toBe("poultry");
  });

  it("maps fish slug to fish", () => {
    expect(getProteinBadgeVariant("fish")).toBe("fish");
  });

  it("maps red-meat slugs to red-meat", () => {
    expect(getProteinBadgeVariant("beef")).toBe("red-meat");
    expect(getProteinBadgeVariant("pork")).toBe("red-meat");
  });

  it("maps vegetarian slugs to vegetarian", () => {
    expect(getProteinBadgeVariant("tofu")).toBe("vegetarian");
    expect(getProteinBadgeVariant("eggs")).toBe("vegetarian");
    expect(getProteinBadgeVariant("dairy")).toBe("vegetarian");
  });

  it("classifies unmapped slugs into vegetarian until PROTEIN_GROUP_MAP is updated", () => {
    expect(getProteinBadgeVariant("unknown-protein")).toBe("vegetarian");
  });
});
