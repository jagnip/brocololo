import { describe, expect, it } from "vitest";
import { createRecipeSchema, updateRecipeSchema } from "./recipe";

const input = {
  name: "Test recipe",
  handsOnTime: 10,
  totalTime: 20,
  servings: 2,
  plannedMealCount: 1,
  ingredients: [],
  instructions: [],
  notes: "Note one\nNote two",
};

describe.each([createRecipeSchema, updateRecipeSchema])("recipe preference validation", (schema) => {
  it("defaults missing preferences to an empty sparse collection", () => {
    expect(schema.parse(input).memberPreferences).toEqual([]);
  });

  it("accepts all explicit preference values", () => {
    const memberPreferences = ["LIKE", "LOVE", "AVOID"].map((preference) => ({
      familyMemberId: preference,
      preference,
    }));
    expect(schema.parse({ ...input, memberPreferences }).memberPreferences).toEqual(memberPreferences);
  });

  it.each(["NEUTRAL", "like", "", null, 1])("rejects invalid preference %j", (preference) => {
    expect(schema.safeParse({
      ...input,
      memberPreferences: [{ familyMemberId: "member-1", preference }],
    }).success).toBe(false);
  });

  it("rejects duplicate member IDs with a field-specific error", () => {
    const result = schema.safeParse({
      ...input,
      memberPreferences: [
        { familyMemberId: "member-1", preference: "LIKE" },
        { familyMemberId: "member-1", preference: "LOVE" },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["memberPreferences", 1, "familyMemberId"]);
    }
  });

  it("rejects empty member IDs", () => {
    expect(schema.safeParse({
      ...input,
      memberPreferences: [{ familyMemberId: "", preference: "LIKE" }],
    }).success).toBe(false);
  });
});
