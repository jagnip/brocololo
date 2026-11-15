import { describe, expect, it } from "vitest";
import {
  adjustStoredMealLotSchema,
  removeStoredMealQuantitySchema,
} from "./storage";

describe("storage validation", () => {
  it.each([[0, true], [-1, false], [100, false], [0.5, false]])(
    "validates adjusted count %s",
    (count, valid) => {
      expect(adjustStoredMealLotSchema.safeParse({
        lotId: "lot-1",
        expectedVersion: 1,
        count,
        cookingFamilyMemberIds: ["jagoda"],
      }).success).toBe(valid);
    },
  );

  it("deduplicates the cooking audience while requiring at least one household member", () => {
    expect(adjustStoredMealLotSchema.parse({
      lotId: "lot-1",
      expectedVersion: 1,
      count: 3,
      cookingFamilyMemberIds: ["jagoda", "jagoda", "nelson"],
    }).cookingFamilyMemberIds).toEqual(["jagoda", "nelson"]);

    expect(adjustStoredMealLotSchema.safeParse({
      lotId: "lot-1",
      expectedVersion: 1,
      count: 3,
      cookingFamilyMemberIds: [],
    }).success).toBe(false);
  });

  it("accepts only a positive bounded quantity and an auditable removal reason", () => {
    expect(removeStoredMealQuantitySchema.safeParse({
      lotId: "lot-1",
      expectedVersion: 1,
      quantity: 1,
      reason: "USED",
    }).success).toBe(true);
    expect(removeStoredMealQuantitySchema.safeParse({
      lotId: "lot-1",
      expectedVersion: 1,
      quantity: 0,
      reason: "USED",
    }).success).toBe(false);
    expect(removeStoredMealQuantitySchema.safeParse({
      lotId: "lot-1",
      expectedVersion: 1,
      quantity: 1,
      reason: "REMOVED",
    }).success).toBe(false);
  });
});
