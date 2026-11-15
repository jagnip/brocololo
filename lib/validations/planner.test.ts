import { describe, expect, it } from "vitest";
import { planBatchesSaveSchema, plannerCriteriaSchema, planSlotsSaveSchema, slotSaveDataSchema, storedMealPlacementClaimsSchema } from "./planner";

const validBatch = {
  id: "batch-1",
  recipeId: "recipe-1",
  storageRows: [
    { count: 2, cookingFamilyMemberIds: ["member-1", "member-2"] },
  ],
  extraPortions: 0,
};

describe("rolling and slot flags", () => {
  it("defaults unchecked rolling cooked state to false", () => {
    const criteria = {
      dateRange: { start: "2026-04-20", end: "2026-04-20" },
      dailyAudienceByMeal: [{ date: "2026-04-20", breakfastFamilyMemberIds: ["member-1"], lunchFamilyMemberIds: ["member-1"], dinnerFamilyMemberIds: ["member-1"] }],
      dailyTimeLimits: [{ date: "2026-04-20", breakfastHandsOnMax: null, lunchHandsOnMax: null, dinnerHandsOnMax: null, breakfastTotalMax: null, lunchTotalMax: null, dinnerTotalMax: null }],
      rollingMeals: [{ recipeId: "recipe-1", meals: 2 }],
    };
    const defaultEntry = plannerCriteriaSchema.parse(criteria).rollingMeals[0];
    expect(defaultEntry?.kind === "custom" ? undefined : defaultEntry?.alreadyCooked).toBe(false);
    const cooked = plannerCriteriaSchema.parse({ ...criteria, rollingMeals: [{ recipeId: "recipe-1", meals: 2, alreadyCooked: true }] }).rollingMeals[0];
    expect(cooked?.kind !== "custom" && cooked?.alreadyCooked).toBe(true);
  });

  it("defaults saved slot flags and rejects non-boolean flags", () => {
    const slot = { date: "2026-04-20", mealType: "DINNER", recipeId: "recipe-1", customMeal: null, alternativeRecipeIds: [], cookingFamilyMemberIds: ["member-1"], used: false };
    expect(slotSaveDataSchema.parse(slot)).toMatchObject({ isRolledOver: false, alreadyCooked: false });
    expect(slotSaveDataSchema.parse({ ...slot, isRolledOver: true, alreadyCooked: true })).toMatchObject({ isRolledOver: true, alreadyCooked: true });
    expect(slotSaveDataSchema.safeParse({ ...slot, alreadyCooked: "true" }).success).toBe(false);
  });

  it("preserves optional placement identities and rejects duplicates", () => {
    const slot = { date: "2026-04-20", mealType: "DINNER", recipeId: "recipe-1", customMeal: null, alternativeRecipeIds: [], cookingFamilyMemberIds: ["member-1"], used: false };
    expect(slotSaveDataSchema.parse({ ...slot, placementId: "placement-1" }).placementId).toBe("placement-1");
    expect(slotSaveDataSchema.safeParse({ ...slot, placementId: "" }).success).toBe(false);
    expect(planSlotsSaveSchema.safeParse([{ ...slot, placementId: "placement-1" }, { ...slot, placementId: "placement-1" }]).success).toBe(false);
    expect(planSlotsSaveSchema.safeParse([{ ...slot, placementId: null }, slot]).success).toBe(true);
  });
});

describe("stored meal placement claim groundwork", () => {
  const claim = {
    placementId: "placement-1", lotId: "lot-1", expectedLotVersion: 1,
    recipeId: "recipe-1", date: "2026-04-20", mealType: "DINNER",
  };

  it("accepts distinct destinations even when they draw from the same lot", () => {
    const result = storedMealPlacementClaimsSchema.parse([
      claim, { ...claim, placementId: "placement-2", mealType: "LUNCH" },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].date).toEqual(new Date("2026-04-20"));
  });

  it("rejects duplicate placement identities and duplicate destination slots", () => {
    expect(storedMealPlacementClaimsSchema.safeParse([claim, { ...claim, mealType: "LUNCH" }]).success).toBe(false);
    expect(storedMealPlacementClaimsSchema.safeParse([claim, { ...claim, placementId: "placement-2", date: "2026-04-20T12:00:00Z" }]).success).toBe(false);
  });

  it("rejects invalid lot versions and missing identities", () => {
    for (const expectedLotVersion of [-1, 0.5, 2147483647]) {
      expect(storedMealPlacementClaimsSchema.safeParse([{ ...claim, expectedLotVersion }]).success).toBe(false);
    }
    expect(storedMealPlacementClaimsSchema.safeParse([{ ...claim, placementId: "" }]).success).toBe(false);
  });

  it("rejects inconsistent snapshots for the same lot", () => {
    for (const change of [{ expectedLotVersion: 2 }, { recipeId: "other" }]) {
      expect(storedMealPlacementClaimsSchema.safeParse([
        claim,
        { ...claim, ...change, placementId: "placement-2", mealType: "LUNCH" },
      ]).success).toBe(false);
    }
  });
});

describe("planBatchesSaveSchema", () => {
  it("accepts zero storage rows and zero extra portions", () => {
    expect(
      planBatchesSaveSchema.parse([
        { ...validBatch, storageRows: [], extraPortions: 0 },
      ]),
    ).toHaveLength(1);
  });

  it("rejects invalid counts, empty audiences, and duplicate ids", () => {
    expect(() =>
      planBatchesSaveSchema.parse([
        {
          ...validBatch,
          storageRows: [{ count: 0, cookingFamilyMemberIds: [] }],
          extraPortions: -1,
        },
      ]),
    ).toThrow();
    expect(() =>
      planBatchesSaveSchema.parse([validBatch, validBatch]),
    ).toThrow("Batch ids must be unique");
  });

  it("normalizes duplicate audience ids", () => {
    expect(
      planBatchesSaveSchema.parse([
        {
          ...validBatch,
          storageRows: [
            {
              count: 1,
              cookingFamilyMemberIds: ["member-1", "member-1"],
            },
          ],
        },
      ])[0]?.storageRows[0]?.cookingFamilyMemberIds,
    ).toEqual(["member-1"]);
  });
});
