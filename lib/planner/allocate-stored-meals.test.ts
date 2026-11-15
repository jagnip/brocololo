import { describe, expect, it } from "vitest";
import { allocateStoredMeals } from "./allocate-stored-meals";

describe("allocateStoredMeals", () => {
  it("reserves exact audience matches globally before allocating older fallback lots", () => {
    const lots = [
      { id: "old", count: 1, cookedAt: new Date("2026-01-01"), cookingFamilyMemberIds: ["a"] },
      { id: "new", count: 1, cookedAt: new Date("2026-01-02"), cookingFamilyMemberIds: ["b", "a", "a"] },
    ];
    const placements = [
      { cookingFamilyMemberIds: ["other"] },
      { cookingFamilyMemberIds: ["a", "b"] },
    ];

    expect(allocateStoredMeals(lots, placements)).toEqual(["old", "new"]);
    expect(lots.map((lot) => lot.count)).toEqual([1, 1]);
  });

  it("does not overspend exhausted lots and leaves unfilled placements null", () => {
    const lots = [
      { id: "empty", count: 0, cookedAt: new Date("2026-01-01"), cookingFamilyMemberIds: ["a"] },
      { id: "available", count: 2, cookedAt: new Date("2026-01-02"), cookingFamilyMemberIds: ["a"] },
    ];
    const placements = Array.from({ length: 3 }, () => ({ cookingFamilyMemberIds: ["a"] }));

    expect(allocateStoredMeals(lots, placements)).toEqual(["available", "available", null]);
    expect(allocateStoredMeals([], placements)).toEqual([null, null, null]);
  });

  it("breaks cooked-date ties by lot ID and placement ties by input order", () => {
    const date = new Date("2026-01-01");
    const lots = [
      { id: "b", count: 1, cookedAt: date, cookingFamilyMemberIds: ["a"] },
      { id: "a", count: 1, cookedAt: date, cookingFamilyMemberIds: ["a"] },
    ];
    const placements = Array.from({ length: 3 }, () => ({ cookingFamilyMemberIds: ["a"] }));

    expect(allocateStoredMeals(lots, placements)).toEqual(["a", "b", null]);
    expect(allocateStoredMeals([...lots].reverse(), placements)).toEqual(["a", "b", null]);
  });

  it("rejects duplicate lot IDs rather than spending the same lot twice", () => {
    const lot = { id: "same", count: 1, cookedAt: new Date("2026-01-01"), cookingFamilyMemberIds: [] };
    expect(() => allocateStoredMeals([lot, lot], [])).toThrow("Stored meal lot IDs must be unique");
  });
});
