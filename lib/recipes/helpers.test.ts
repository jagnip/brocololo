import { describe, expect, it } from "vitest";
import type { RecipeType } from "@/types/recipe";
import { recipeToFormData } from "./helpers";

const recipe: RecipeType = {
  id: "recipe-1",
  userId: "user-1",
  name: "Test recipe",
  slug: "test-recipe",
  handsOnTime: 10,
  totalTime: 20,
  servings: 2,
  notes: ["Note"],
  lastUsedInPlanner: null,
  excludeFromPlanner: false,
  archivedAt: null,
  plannedMealCount: 1,
  isBatchRecipe: false,
  categories: [],
  ingredientGroups: [],
  ingredients: [],
  instructions: [],
  images: [],
  audienceMembers: [{ familyMemberId: "member-1" }],
  memberPortions: [],
  memberPreferences: [
    { familyMemberId: "member-1", preference: "LIKE" },
    { familyMemberId: "member-2", preference: "LOVE" },
    { familyMemberId: "removed-member", preference: "AVOID" },
  ],
};

describe("recipeToFormData member preferences", () => {
  it("keeps only current household rows without adding neutral rows", () => {
    expect(recipeToFormData(recipe, ["member-2", "member-3"]).memberPreferences)
      .toEqual([{ familyMemberId: "member-2", preference: "LOVE" }]);
    expect(recipe.memberPreferences).toHaveLength(3);
  });

  it("falls back to recipe audience when household IDs are omitted", () => {
    expect(recipeToFormData(recipe).memberPreferences)
      .toEqual([{ familyMemberId: "member-1", preference: "LIKE" }]);
  });

  it("returns no preferences for an empty household", () => {
    expect(recipeToFormData(recipe, []).memberPreferences).toEqual([]);
  });
});
