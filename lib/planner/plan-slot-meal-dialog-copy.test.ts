import { describe, expect, it } from "vitest";
import {
  getAddMealDialogCopy,
  getBulkEditMealsDialogCopy,
  getEditMealDialogCopy,
  getMealChangeSummary,
} from "./plan-slot-meal-dialog-copy";

describe("plan-slot-meal-dialog-copy", () => {
  it("returns add-meal copy with slot context subtitle", () => {
    expect(getAddMealDialogCopy("Lunch · Fri 11 Jul")).toEqual({
      title: "Add meal",
      subtitle: "Lunch · Fri 11 Jul",
      saveLabel: "Save meal",
    });
  });

  it("returns edit-meal copy for a filled slot", () => {
    expect(
      getEditMealDialogCopy("Wed 9 Jul · Lunch · Tuna melt"),
    ).toEqual({
      title: "Edit meal",
      subtitle: "Wed 9 Jul · Lunch · Tuna melt",
      saveLabel: "Save meal",
    });
  });

  it("uses singular slot copy for one selected slot in bulk", () => {
    expect(getBulkEditMealsDialogCopy(1)).toEqual({
      title: "Edit meals",
      subtitle: "1 slot selected",
      saveLabel: "Save meals",
    });
  });

  it("uses plural slot copy for multiple selected slots", () => {
    expect(getBulkEditMealsDialogCopy(5)).toEqual({
      title: "Edit meals",
      subtitle: "5 slots selected",
      saveLabel: "Save meals",
    });
  });
});

describe("getMealChangeSummary", () => {
  it("shows from → to when the meal changes", () => {
    expect(
      getMealChangeSummary({
        fromName: "Tuna melt",
        toName: "Skyrnik",
      }),
    ).toBe("Tuna melt → Skyrnik");
  });

  it("shows the new name when adding", () => {
    expect(
      getMealChangeSummary({
        fromName: null,
        toName: "Skyrnik",
      }),
    ).toBe("Skyrnik");
  });

  it("returns null when the meal name is unchanged", () => {
    expect(
      getMealChangeSummary({
        fromName: "Skyrnik",
        toName: "Skyrnik",
      }),
    ).toBeNull();
  });

  it("returns null when nothing is selected", () => {
    expect(
      getMealChangeSummary({
        fromName: null,
        toName: null,
      }),
    ).toBeNull();
  });
});
