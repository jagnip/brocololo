import { describe, expect, it } from "vitest";
import { createRecipeCategorySchema } from "../validations/category";

describe("createRecipeCategorySchema", () => {
  it("trims and collapses whitespace in category name", () => {
    const parsed = createRecipeCategorySchema.parse({
      flavourSlug: "savoury",
      kind: "RECIPE_TYPE",
      name: "   Stir    fry   ",
    });

    expect(parsed.name).toBe("Stir fry");
  });

  it("rejects empty category name after trimming", () => {
    const result = createRecipeCategorySchema.safeParse({
      flavourSlug: "sweet",
      kind: "RECIPE_TYPE",
      name: "    ",
    });

    expect(result.success).toBe(false);
  });

  it("accepts both allowed category kinds", () => {
    const protein = createRecipeCategorySchema.safeParse({
      flavourSlug: "savoury",
      kind: "PROTEIN",
      name: "Chicken",
    });
    const recipeType = createRecipeCategorySchema.safeParse({
      flavourSlug: "sweet",
      kind: "RECIPE_TYPE",
      name: "Sweet pies",
    });

    expect(protein.success).toBe(true);
    expect(recipeType.success).toBe(true);
  });
});
