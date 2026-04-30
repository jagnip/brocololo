import { describe, expect, it } from "vitest";
import { categorySchema } from "../validations/category";

describe("categorySchema", () => {
  it("accepts fixed category shapes", () => {
    const parsed = categorySchema.parse({
      id: "meal-occasion-breakfast",
      name: "Breakfast",
      slug: "breakfast",
      type: "MEAL_OCCASION",
    });
    expect(parsed.slug).toBe("breakfast");
  });

  it("rejects unknown category types", () => {
    const result = categorySchema.safeParse({
      id: "cat-1",
      name: "Legacy",
      slug: "legacy",
      type: "UNKNOWN_TYPE",
    });
    expect(result.success).toBe(false);
  });
});
