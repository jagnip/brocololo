import { describe, expect, it } from "vitest";
import { adjustRollingMealSchema, discardRollingMealQuantitySchema } from "./rolling-meals";

describe("rolling meal inputs", () => {
  it("accepts zero adjustments and positive discard quantities", () => {
    expect(adjustRollingMealSchema.safeParse({ entryId: "e", expectedVersion: 1, count: 0 }).success).toBe(true);
    expect(discardRollingMealQuantitySchema.safeParse({ entryId: "e", expectedVersion: 1, quantity: 1 }).success).toBe(true);
  });
  it("rejects invalid versions, fractional counts and zero discards", () => {
    expect(adjustRollingMealSchema.safeParse({ entryId: "e", expectedVersion: 0, count: 1 }).success).toBe(false);
    expect(adjustRollingMealSchema.safeParse({ entryId: "e", expectedVersion: 1, count: 1.5 }).success).toBe(false);
    expect(discardRollingMealQuantitySchema.safeParse({ entryId: "e", expectedVersion: 1, quantity: 0 }).success).toBe(false);
  });
});
