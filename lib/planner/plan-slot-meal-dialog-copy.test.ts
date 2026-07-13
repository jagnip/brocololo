import { describe, expect, it } from "vitest";
import {
  getAddMealDialogCopy,
  getReplaceMealDialogCopy,
} from "./plan-slot-meal-dialog-copy";

describe("plan-slot-meal-dialog-copy", () => {
  it("returns add-meal copy with slot context subtitle", () => {
    expect(getAddMealDialogCopy("Lunch · Fri 11 Jul")).toEqual({
      title: "Add meal",
      subtitle: "Lunch · Fri 11 Jul",
      saveLabel: "Save meal",
    });
  });

  it("uses singular slot copy for one selected slot", () => {
    expect(getReplaceMealDialogCopy(1)).toEqual({
      title: "Replace meal",
      subtitle: "This will update 1 selected slot.",
      saveLabel: "Save changes",
    });
  });

  it("uses plural slot copy for multiple selected slots", () => {
    expect(getReplaceMealDialogCopy(5)).toEqual({
      title: "Replace meal",
      subtitle: "This will update 5 selected slots.",
      saveLabel: "Save changes",
    });
  });
});
