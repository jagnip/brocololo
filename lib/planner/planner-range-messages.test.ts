import { describe, expect, it } from "vitest";
import {
  formatMealCountLabel,
  formatMovedMealsToast,
  formatRangeChangeDialogDescription,
  formatRangeChangeDialogTitle,
} from "./planner-range-messages";

describe("planner-range-messages", () => {
  it("uses singular meal labels for a count of one", () => {
    expect(formatMealCountLabel(1)).toBe("1 meal");
    expect(formatMovedMealsToast(1)).toBe("Moved 1 meal to a new day.");
    expect(formatRangeChangeDialogTitle(1)).toBe(
      "A meal cannot be kept in this range",
    );
    expect(
      formatRangeChangeDialogDescription({
        relocatedCount: 0,
        unallocatableCount: 1,
      }),
    ).toBe(
      "1 meal does not fit in the new date range and will be removed if you continue.",
    );
  });

  it("uses plural meal labels for counts greater than one", () => {
    expect(formatMealCountLabel(2)).toBe("2 meals");
    expect(formatMovedMealsToast(2)).toBe("Moved 2 meals to new days.");
    expect(formatRangeChangeDialogTitle(2)).toBe(
      "Some meals cannot be kept in this range",
    );
    expect(
      formatRangeChangeDialogDescription({
        relocatedCount: 2,
        unallocatableCount: 1,
      }),
    ).toBe(
      "We moved 2 meals to open slots. 1 meal still does not fit and will be removed if you continue.",
    );
  });
});
