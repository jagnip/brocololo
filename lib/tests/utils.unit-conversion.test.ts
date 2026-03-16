import { describe, it, expect } from "vitest";
import {
  convertAmount,
  getIngredientDisplay,
  UnitConversionWithName,
} from "../recipes/helpers";
import { createMockIngredientUnit } from "./test-helpers";

// ============================================================================
// SHARED TEST DATA
// ============================================================================

/** Reusable unit conversions for an ingredient that supports grams, tbsp, and cup */
function createMultiUnitConversions(): UnitConversionWithName[] {
  return [
    createMockIngredientUnit("ing-1", "unit-grams", 1, "g"),
    createMockIngredientUnit("ing-1", "unit-tbsp", 15, "tbsp"),
    createMockIngredientUnit("ing-1", "unit-cup", 240, "cup"),
  ];
}

/** Single-unit conversions (only grams) */
function createSingleUnitConversions(): UnitConversionWithName[] {
  return [createMockIngredientUnit("ing-1", "unit-grams", 1, "g")];
}

// ============================================================================
// convertAmount
// ============================================================================

/**
 * TESTING convertAmount
 *
 * Pure math function: newAmount = amount * (fromGramsPerUnit / toGramsPerUnit)
 *
 * This converts an amount expressed in one unit to an equivalent amount
 * in another unit, using their respective grams-per-unit rates as the
 * common denominator.
 */
describe("convertAmount", () => {
  /**
   * HAPPY PATH: Convert tablespoons to cups
   *
   * 2 tbsp (15g/tbsp) → cups (240g/cup)
   * = 2 * (15 / 240) = 0.125 cups
   */
  it("should convert between two non-gram units", () => {
    const result = convertAmount(2, 15, 240);
    expect(result).toBeCloseTo(0.125);
  });

  /**
   * HAPPY PATH: Convert cups to grams
   *
   * 1 cup (240g/cup) → grams (1g/g)
   * = 1 * (240 / 1) = 240g
   */
  it("should convert to grams when toGramsPerUnit is 1", () => {
    const result = convertAmount(1, 240, 1);
    expect(result).toBe(240);
  });

  /**
   * HAPPY PATH: Convert grams to cups
   *
   * 240g (1g/g) → cups (240g/cup)
   * = 240 * (1 / 240) = 1 cup
   */
  it("should convert from grams to another unit", () => {
    const result = convertAmount(240, 1, 240);
    expect(result).toBeCloseTo(1);
  });

  /**
   * EDGE CASE: Same unit (no conversion)
   *
   * Amount should remain unchanged when from and to are the same.
   */
  it("should return the same amount when converting to the same unit", () => {
    const result = convertAmount(5, 15, 15);
    expect(result).toBe(5);
  });

  /**
   * EDGE CASE: Zero amount
   *
   * 0 of anything is 0 of anything else.
   */
  it("should return 0 when amount is 0", () => {
    const result = convertAmount(0, 15, 240);
    expect(result).toBe(0);
  });

  /**
   * EDGE CASE: Fractional amounts
   *
   * 0.5 cup (240g/cup) → tbsp (15g/tbsp)
   * = 0.5 * (240 / 15) = 8 tbsp
   */
  it("should handle fractional input amounts", () => {
    const result = convertAmount(0.5, 240, 15);
    expect(result).toBe(8);
  });

  /**
   * EDGE CASE: Large conversion ratio
   *
   * 1 kg (1000g/kg) → tsp (5g/tsp)
   * = 1 * (1000 / 5) = 200 tsp
   */
  it("should handle large conversion ratios", () => {
    const result = convertAmount(1, 1000, 5);
    expect(result).toBe(200);
  });
});

// ============================================================================
// getIngredientDisplay
// ============================================================================

/**
 * TESTING getIngredientDisplay
 *
 * Determines:
 *  - displayAmount: the formatted amount string (or null)
 *  - displayUnitName: which unit name to show
 *  - canConvert: whether a unit selector should appear
 *  - availableUnits: the full list of unit conversions
 *
 * canConvert is true only when ALL of:
 *  1. amount is not null
 *  2. the original unit exists in unitConversions
 *  3. there is more than one unit conversion available
 */
describe("getIngredientDisplay", () => {
  // --------------------------------------------------------------------------
  // canConvert logic
  // --------------------------------------------------------------------------

  describe("canConvert", () => {
    /**
     * HAPPY PATH: Ingredient with multiple units and a valid amount
     *
     * Should allow conversion.
     */
    it("should be true when ingredient has multiple units and a valid amount", () => {
      const result = getIngredientDisplay(
        2,
        "unit-tbsp",
        "tbsp",
        "unit-tbsp",
        createMultiUnitConversions(),
        1,
        1,
      );

      expect(result.canConvert).toBe(true);
    });

    /**
     * EDGE CASE: Null amount
     *
     * Ingredients like "salt to taste" have no amount — can't convert.
     */
    it("should be false when amount is null", () => {
      const result = getIngredientDisplay(
        null,
        "unit-tbsp",
        "tbsp",
        "unit-tbsp",
        createMultiUnitConversions(),
        1,
        1,
      );

      expect(result.canConvert).toBe(false);
    });

    /**
     * EDGE CASE: Only one unit available
     *
     * Nothing to convert to — hide the selector.
     */
    it("should be false when ingredient has only one unit", () => {
      const result = getIngredientDisplay(
        100,
        "unit-grams",
        "g",
        "unit-grams",
        createSingleUnitConversions(),
        1,
        1,
      );

      expect(result.canConvert).toBe(false);
    });

    /**
     * EDGE CASE: Original unit not in unitConversions
     *
     * Data inconsistency — the recipe uses a unit that has no gramsPerUnit
     * entry for this ingredient. Can't compute a ratio without the base.
     */
    it("should be false when original unit is not in unitConversions", () => {
      const result = getIngredientDisplay(
        2,
        "unit-unknown",
        "mystery unit",
        "unit-unknown",
        createMultiUnitConversions(),
        1,
        1,
      );

      expect(result.canConvert).toBe(false);
    });

    /**
     * EDGE CASE: Empty unitConversions array
     *
     * No conversions defined at all.
     */
    it("should be false when unitConversions is empty", () => {
      const result = getIngredientDisplay(
        10,
        "unit-grams",
        "g",
        "unit-grams",
        [],
        1,
        1,
      );

      expect(result.canConvert).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // displayAmount and displayUnitName
  // --------------------------------------------------------------------------

  describe("display amount and unit", () => {
    /**
     * HAPPY PATH: No unit change (selected = original)
     *
     * Should show the original unit and scale by serving/calorie factors only.
     * 2 tbsp * 1 (serving) * 1 (calorie) = "2.0"
     */
    it("should show original amount and unit when no unit change", () => {
      const result = getIngredientDisplay(
        2,
        "unit-tbsp",
        "tbsp",
        "unit-tbsp",
        createMultiUnitConversions(),
        1,
        1,
      );

      expect(result.displayAmount).toBe("2");
      expect(result.displayUnitName).toBe("tbsp");
      expect(result.rawAmountInGrams).toBe(30);
      expect(result.selectedUnitGramsPerUnit).toBe(15);
    });

    /**
     * HAPPY PATH: Unit changed from tbsp to cup
     *
     * 2 tbsp → cups = 2 * (15 / 240) = 0.125 → "0.1"
     */
    it("should convert amount when a different unit is selected", () => {
      const result = getIngredientDisplay(
        2,
        "unit-tbsp",
        "tbsp",
        "unit-cup",
        createMultiUnitConversions(),
        1,
        1,
      );

      expect(result.displayAmount).toBe("0.1");
      expect(result.displayUnitName).toBe("cup");
    });

    /**
     * HAPPY PATH: Unit changed from tbsp to grams
     *
     * 2 tbsp → grams = 2 * (15 / 1) = 30 → "30.0"
     */
    it("should convert to grams correctly", () => {
      const result = getIngredientDisplay(
        2,
        "unit-tbsp",
        "tbsp",
        "unit-grams",
        createMultiUnitConversions(),
        1,
        1,
      );

      expect(result.displayAmount).toBe("30");
      expect(result.displayUnitName).toBe("g");
      expect(result.rawAmountInGrams).toBe(30);
      expect(result.selectedUnitGramsPerUnit).toBe(1);
    });

    /**
     * EDGE CASE: Null amount
     *
     * Should return null displayAmount and the original unit name.
     */
    it("should return null displayAmount when amount is null", () => {
      const result = getIngredientDisplay(
        null,
        "unit-tbsp",
        "tbsp",
        "unit-tbsp",
        createMultiUnitConversions(),
        1,
        1,
      );

      expect(result.displayAmount).toBeNull();
      expect(result.displayUnitName).toBe("");
      expect(result.rawAmountInGrams).toBeNull();
      expect(result.selectedUnitGramsPerUnit).toBeNull();
    });

    /**
     * EDGE CASE: Selected unit not found in conversions
     *
     * If selectedUnitId points to a unit that doesn't exist in the
     * conversions (e.g., stale state after data refresh), should fall
     * back to showing the original scaled amount and unit.
     */
    it("should fall back to original when selected unit is not in conversions", () => {
      const result = getIngredientDisplay(
        2,
        "unit-tbsp",
        "tbsp",
        "unit-nonexistent",
        createMultiUnitConversions(),
        1,
        1,
      );

      expect(result.displayAmount).toBe("2");
      expect(result.displayUnitName).toBe("tbsp");
      expect(result.rawAmountInGrams).toBe(30);
      expect(result.selectedUnitGramsPerUnit).toBe(15);
    });
  });

  // --------------------------------------------------------------------------
  // Scaling factors
  // --------------------------------------------------------------------------

  describe("scaling", () => {
    /**
     * Serving scaling should multiply the amount before display.
     *
     * 2 tbsp * 2 (servings) * 1 (calories) = 4 → "4.0"
     */
    it("should apply serving scaling factor", () => {
      const result = getIngredientDisplay(
        2,
        "unit-tbsp",
        "tbsp",
        "unit-tbsp",
        createMultiUnitConversions(),
        2,
        1,
      );

      expect(result.displayAmount).toBe("4");
      expect(result.rawAmountInGrams).toBe(60);
    });

    /**
     * Calorie scaling should multiply the amount before display.
     *
     * 2 tbsp * 1 (servings) * 1.5 (calories) = 3 → "3.0"
     */
    it("should apply calorie scaling factor", () => {
      const result = getIngredientDisplay(
        2,
        "unit-tbsp",
        "tbsp",
        "unit-tbsp",
        createMultiUnitConversions(),
        1,
        1.5,
      );

      expect(result.displayAmount).toBe("3");
      expect(result.rawAmountInGrams).toBe(45);
    });

    /**
     * Both scaling factors AND unit conversion should compose correctly.
     *
     * 2 tbsp * 2 (servings) * 1.5 (calories) = 6 tbsp
     * 6 tbsp → grams = 6 * (15 / 1) = 90 → "90.0"
     */
    it("should compose serving scaling, calorie scaling, and unit conversion", () => {
      const result = getIngredientDisplay(
        2,
        "unit-tbsp",
        "tbsp",
        "unit-grams",
        createMultiUnitConversions(),
        2,
        1.5,
      );

      expect(result.displayAmount).toBe("90");
      expect(result.displayUnitName).toBe("g");
      expect(result.rawAmountInGrams).toBe(90);
    });

    /**
     * Scaling should still apply even when canConvert is false
     * (single unit ingredient).
     *
     * 100g * 0.5 (servings) * 1 (calories) = 50 → "50.0"
     */
    it("should apply scaling even when unit conversion is not available", () => {
      const result = getIngredientDisplay(
        100,
        "unit-grams",
        "g",
        "unit-grams",
        createSingleUnitConversions(),
        0.5,
        1,
      );

      expect(result.displayAmount).toBe("50");
      expect(result.canConvert).toBe(false);
      expect(result.rawAmountInGrams).toBe(50);
    });
  });

  // --------------------------------------------------------------------------
  // availableUnits
  // --------------------------------------------------------------------------

  describe("availableUnits", () => {
    /**
     * Should always return the full unitConversions list,
     * regardless of whether conversion is possible.
     */
    it("should pass through the full unitConversions array", () => {
      const conversions = createMultiUnitConversions();

      const result = getIngredientDisplay(
        2,
        "unit-tbsp",
        "tbsp",
        "unit-tbsp",
        conversions,
        1,
        1,
      );

      expect(result.availableUnits).toBe(conversions);
      expect(result.availableUnits).toHaveLength(3);
    });

    /**
     * Should still return conversions when amount is null.
     */
    it("should return conversions even when amount is null", () => {
      const conversions = createMultiUnitConversions();

      const result = getIngredientDisplay(
        null,
        "unit-tbsp",
        "tbsp",
        "unit-tbsp",
        conversions,
        1,
        1,
      );

      expect(result.availableUnits).toBe(conversions);
    });
  });
});
