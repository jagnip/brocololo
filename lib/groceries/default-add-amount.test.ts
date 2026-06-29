import { describe, expect, it } from "vitest";
import { getDefaultAmountAndUnitForGroceryAdd } from "@/lib/groceries/default-add-amount";

function conversion(unitId: string, name: string) {
  return { unitId, unit: { name } };
}

describe("getDefaultAmountAndUnitForGroceryAdd", () => {
  it("returns null amount and unit for piece ingredients", () => {
    const result = getDefaultAmountAndUnitForGroceryAdd({
      defaultUnitId: "unit-g",
      unitConversions: [
        conversion("unit-g", "g"),
        conversion("unit-piece", "piece"),
      ],
    });

    expect(result).toEqual({ unitId: null, amount: null });
  });

  it("returns null amount and unit when only g is available", () => {
    const result = getDefaultAmountAndUnitForGroceryAdd({
      defaultUnitId: null,
      unitConversions: [conversion("unit-g", "g")],
    });

    expect(result).toEqual({ unitId: null, amount: null });
  });

  it("returns null amount and unit for stick-only ingredients", () => {
    const result = getDefaultAmountAndUnitForGroceryAdd({
      defaultUnitId: "unit-g",
      unitConversions: [
        conversion("unit-g", "g"),
        conversion("unit-stick", "stick"),
      ],
    });

    expect(result).toEqual({ unitId: null, amount: null });
  });

  it("returns null amount and unit for volume-only ingredients", () => {
    const result = getDefaultAmountAndUnitForGroceryAdd({
      defaultUnitId: "unit-g",
      unitConversions: [
        conversion("unit-g", "g"),
        conversion("unit-tbsp", "tbsp"),
      ],
    });

    expect(result).toEqual({ unitId: null, amount: null });
  });

  it("returns null amount and unit when there are no conversions", () => {
    const result = getDefaultAmountAndUnitForGroceryAdd({
      defaultUnitId: null,
      unitConversions: [],
    });

    expect(result).toEqual({ unitId: null, amount: null });
  });
});
