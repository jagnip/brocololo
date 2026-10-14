import { describe, expect, it } from "vitest";
import { createMockRecipe } from "@/lib/tests/test-helpers";
import { isRecipeAvoidedByAudience, pickBestCandidate, scoreRecipePreferences, type ScoringContext } from "./scoring";

const ctx: ScoringContext = {
  assignedSlots: [],
  currentSlot: { date: new Date("2026-10-14"), mealType: "BREAKFAST" },
  maxDaysSinceLastUsedCandidate: 0,
  fridgeIngredientIds: [],
  rollingRecipeIds: [],
  currentAudienceFamilyMemberIds: ["self"],
};

describe("recipe preference scoring", () => {
  it.each([
    [[], ["self"], 0],
    [[{ familyMemberId: "self", preference: "LIKE" as const }], ["self"], 0.5],
    [[{ familyMemberId: "self", preference: "LOVE" as const }], ["self"], 1],
    [[{ familyMemberId: "self", preference: "LOVE" as const }], ["self", "partner"], 0.5],
    [[{ familyMemberId: "self", preference: "LOVE" as const }, { familyMemberId: "partner", preference: "LIKE" as const }], ["self", "partner"], 0.75],
    [[{ familyMemberId: "partner", preference: "LOVE" as const }], ["self"], 0],
    [[{ familyMemberId: "self", preference: "LOVE" as const }], [], 0],
  ])("averages sparse preferences %j for audience %j", (memberPreferences, audience, expected) => {
    expect(scoreRecipePreferences(createMockRecipe({ memberPreferences }), {
      ...ctx, currentAudienceFamilyMemberIds: audience,
    })).toBe(expected);
  });

  it("lets any eater's Avoid veto Love, but ignores unassigned people", () => {
    const recipe = createMockRecipe({ memberPreferences: [
      { familyMemberId: "self", preference: "LOVE" },
      { familyMemberId: "partner", preference: "AVOID" },
    ] });
    expect(isRecipeAvoidedByAudience(recipe, ["self", "partner"])).toBe(true);
    expect(isRecipeAvoidedByAudience(recipe, ["self"])).toBe(false);
  });

  it("prefers Love to Like and Neutral when other factors are equal", () => {
    const recipes = [createMockRecipe({ id: "neutral" }), createMockRecipe({ id: "like", memberPreferences: [{ familyMemberId: "self", preference: "LIKE" }] }), createMockRecipe({ id: "love", memberPreferences: [{ familyMemberId: "self", preference: "LOVE" }] })];
    const result = pickBestCandidate(recipes, ctx);
    expect(result.winner.id).toBe("love");
    expect(result.alternatives.map((recipe) => recipe.id)).toEqual(["like", "neutral"]);
  });

  it("prefers a fresh Neutral recipe to an already selected loved recipe", () => {
    const loved = createMockRecipe({ id: "love", memberPreferences: [{ familyMemberId: "self", preference: "LOVE" }] });
    const neutral = createMockRecipe({ id: "neutral" });
    expect(pickBestCandidate([loved, neutral], { ...ctx, assignedSlots: [{ date: ctx.currentSlot.date, mealType: "BREAKFAST", recipe: loved, alternatives: [], customMeal: null, used: false }] }).winner.id).toBe("neutral");
  });
});
