import { describe, expect, it } from "vitest";
import { createMockRecipe } from "@/lib/tests/test-helpers";
import {
  isRecipeAvoidedByAudience,
  isRecipePreferredByAudience,
  pickBestCandidate,
  scoreRecipePreferenceMix,
  scoreRecipePreferences,
  type ScoringContext,
} from "./scoring";
import type { RecipeType } from "@/types/recipe";
import type { SlotInputType } from "@/types/planner";

const ctx: ScoringContext = {
  assignedSlots: [],
  plannedRecipeSlots: [],
  currentSlot: { date: new Date("2026-10-14"), mealType: "BREAKFAST" },
  maxDaysSinceLastUsedCandidate: 0,
  fridgeIngredientIds: [],
  rollingRecipeIds: [],
  currentAudienceFamilyMemberIds: ["self"],
};

function planSlot(
  recipe: RecipeType,
  mealType: SlotInputType["mealType"] = "BREAKFAST",
  cookingFamilyMemberIds: string[] | undefined = ["self"],
): SlotInputType {
  return {
    date: ctx.currentSlot.date,
    mealType,
    recipe,
    alternatives: [],
    customMeal: null,
    cookingFamilyMemberIds,
    used: false,
  };
}

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

  it("classifies Like and Love only for the current audience", () => {
    const recipe = createMockRecipe({ memberPreferences: [
      { familyMemberId: "self", preference: "LIKE" },
      { familyMemberId: "partner", preference: "LOVE" },
    ] });

    expect(isRecipePreferredByAudience(recipe, ["self"])).toBe(true);
    expect(isRecipePreferredByAudience(recipe, ["partner"])).toBe(true);
    expect(isRecipePreferredByAudience(recipe, ["guest"])).toBe(false);
    expect(isRecipePreferredByAudience(recipe, [])).toBe(false);
  });

  it.each([
    { preferredCount: 0, neutralCount: 0, preferredScore: 0.5, neutralScore: 0.5 },
    { preferredCount: 1, neutralCount: 0, preferredScore: 0, neutralScore: 1 },
    { preferredCount: 1, neutralCount: 1, preferredScore: 0.5, neutralScore: 0.5 },
    { preferredCount: 1, neutralCount: 2, preferredScore: 1, neutralScore: 0 },
    { preferredCount: 2, neutralCount: 1, preferredScore: 0, neutralScore: 1 },
  ])(
    "balances projected breakfast mix: %j",
    ({ preferredCount, neutralCount, preferredScore, neutralScore }) => {
      const preferred = createMockRecipe({
        id: "preferred",
        memberPreferences: [{ familyMemberId: "self", preference: "LOVE" }],
      });
      const neutral = createMockRecipe({ id: "neutral" });
      const plannedRecipeSlots = [
        ...Array.from({ length: preferredCount }, () => planSlot(preferred)),
        ...Array.from({ length: neutralCount }, () => planSlot(neutral)),
      ];
      const mixCtx = { ...ctx, plannedRecipeSlots };

      expect(scoreRecipePreferenceMix(preferred, mixCtx)).toBe(preferredScore);
      expect(scoreRecipePreferenceMix(neutral, mixCtx)).toBe(neutralScore);
    },
  );

  it("balances each meal type independently and ignores slots without an audience", () => {
    const preferred = createMockRecipe({
      id: "preferred",
      memberPreferences: [{ familyMemberId: "self", preference: "LOVE" }],
    });
    const neutral = createMockRecipe({ id: "neutral" });
    const mixCtx = {
      ...ctx,
      plannedRecipeSlots: [
        planSlot(preferred, "LUNCH"),
        planSlot(preferred, "BREAKFAST", []),
      ],
    };

    expect(scoreRecipePreferenceMix(preferred, mixCtx)).toBe(0.5);
    expect(scoreRecipePreferenceMix(neutral, mixCtx)).toBe(0.5);
  });

  it("uses each planned slot's audience when counting its preference", () => {
    const partnerFavorite = createMockRecipe({
      id: "partner-favorite",
      memberPreferences: [{ familyMemberId: "partner", preference: "LOVE" }],
    });
    const selfFavorite = createMockRecipe({
      id: "self-favorite",
      memberPreferences: [{ familyMemberId: "self", preference: "LOVE" }],
    });
    const neutral = createMockRecipe({ id: "neutral" });
    const mixCtx = {
      ...ctx,
      plannedRecipeSlots: [planSlot(partnerFavorite, "BREAKFAST", ["partner"])],
    };

    expect(scoreRecipePreferenceMix(selfFavorite, mixCtx)).toBe(0);
    expect(scoreRecipePreferenceMix(neutral, mixCtx)).toBe(1);
  });

  it("chooses a neutral recipe after one preferred recipe", () => {
    const preferred = createMockRecipe({
      id: "preferred",
      memberPreferences: [{ familyMemberId: "self", preference: "LOVE" }],
    });
    const neutral = createMockRecipe({ id: "neutral" });
    const result = pickBestCandidate([preferred, neutral], {
      ...ctx,
      plannedRecipeSlots: [planSlot(preferred)],
    });

    expect(result.winner.id).toBe("neutral");
  });

  it("rotates to an unused preferred recipe when the mix calls for a favorite", () => {
    const favoriteA = createMockRecipe({
      id: "favorite-a",
      memberPreferences: [{ familyMemberId: "self", preference: "LOVE" }],
    });
    const favoriteB = createMockRecipe({
      id: "favorite-b",
      memberPreferences: [{ familyMemberId: "self", preference: "LOVE" }],
    });
    const neutral = createMockRecipe({ id: "neutral" });
    const plannedRecipeSlots = [
      planSlot(favoriteA),
      planSlot(neutral),
      planSlot(neutral),
    ];
    const result = pickBestCandidate([favoriteA, favoriteB, neutral], {
      ...ctx,
      plannedRecipeSlots,
    });

    expect(result.winner.id).toBe("favorite-b");
  });

  it("keeps an explicit rolling recipe ahead of the preferred-mix target", () => {
    const favorite = createMockRecipe({
      id: "favorite",
      memberPreferences: [{ familyMemberId: "self", preference: "LOVE" }],
    });
    const rolling = createMockRecipe({ id: "rolling" });
    const neutral = createMockRecipe({ id: "neutral" });
    const result = pickBestCandidate([favorite, rolling], {
      ...ctx,
      plannedRecipeSlots: [planSlot(neutral), planSlot(neutral), planSlot(favorite)],
      rollingRecipeIds: [rolling.id],
    });

    expect(result.winner.id).toBe("rolling");
  });
});
