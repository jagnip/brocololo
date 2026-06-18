import { describe, expect, it } from "vitest";
import { getDefaultAmountAndUnitForGroceryAdd } from "@/lib/groceries/default-add-amount";

function conversion(unitId: string, name: string) {
  return { unitId, unit: { name } };
}

describe("getDefaultAmountAndUnitForGroceryAdd", () => {
  it("prefers piece with amount 1 even when defaultUnitId is grams", () => {
    const result = getDefaultAmountAndUnitForGroceryAdd({
      defaultUnitId: "unit-g",
      unitConversions: [
        conversion("unit-g", "g"),
        conversion("unit-piece", "piece"),
      ],
    });

    expect(result).toEqual({ unitId: "unit-piece", amount: 1 });
  });

  it("returns null amount with grams unit when only g is available", () => {
    const result = getDefaultAmountAndUnitForGroceryAdd({
      defaultUnitId: null,
      unitConversions: [conversion("unit-g", "g")],
    });

    expect(result).toEqual({ unitId: "unit-g", amount: null });
  });

  it("uses stick when piece is not available", () => {
    const result = getDefaultAmountAndUnitForGroceryAdd({
      defaultUnitId: "unit-g",
      unitConversions: [
        conversion("unit-g", "g"),
        conversion("unit-stick", "stick"),
      ],
    });

    expect(result).toEqual({ unitId: "unit-stick", amount: 1 });
  });

  it("does not auto-fill amount for volume-only ingredients", () => {
    const result = getDefaultAmountAndUnitForGroceryAdd({
      defaultUnitId: "unit-g",
      unitConversions: [
        conversion("unit-g", "g"),
        conversion("unit-tbsp", "tbsp"),
      ],
    });

    expect(result).toEqual({ unitId: "unit-g", amount: null });
  });

  it("returns null unit and amount when there are no conversions", () => {
    const result = getDefaultAmountAndUnitForGroceryAdd({
      defaultUnitId: null,
      unitConversions: [],
    });

    expect(result).toEqual({ unitId: null, amount: null });
  });
});
