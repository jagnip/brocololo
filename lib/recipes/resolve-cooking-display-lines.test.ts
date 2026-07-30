import { describe, expect, it } from "vitest";
import {
  createMockIngredient,
  createMockIngredientUnit,
  createMockRecipeIngredient,
  createMockUnit,
} from "@/lib/tests/test-helpers";
import {
  buildMemberPortionsFromFamily,
  resolveCookingAggregatedLines,
} from "@/lib/recipes/resolve-cooking-display-lines";
import { COOK_SESSION_EXTRAS_SHARE_ID } from "@/lib/recipes/shared-portion-shares";
import type { FamilyMemberRow } from "@/lib/db/family-members";

const familyMembers: FamilyMemberRow[] = [
  { id: "family-self", name: "Jagoda", isSelf: true, sortOrder: 0, portionMultiplier: 1 },
  { id: "family-member-1", name: "Nelson", isSelf: false, sortOrder: 1, portionMultiplier: 2 },
];

describe("resolveCookingAggregatedLines", () => {
  it("aggregates shared ingredient amounts across selected eaters", () => {
    const sliceUnit = createMockUnit({ id: "unit-slice", name: "slice", namePlural: "slices" });
    const bread = createMockIngredient({
      id: "ing-bread",
      unitConversions: [
        createMockIngredientUnit("ing-bread", "unit-slice", 1, "slice"),
      ],
    });
    const breadRow = createMockRecipeIngredient({
      id: "ri-bread",
      amount: 1,
      nutritionTarget: "BOTH",
      ingredient: bread,
      unit: sliceUnit,
    });

    const lines = resolveCookingAggregatedLines({
      recipeIngredients: [breadRow],
      recipeServings: 1,
      familyMembers,
      cookingFamilyMemberIds: ["family-self", "family-member-1"],
      mealCount: 1,
      audienceMemberIds: familyMembers.map((member) => member.id),
      memberPortions: buildMemberPortionsFromFamily(familyMembers),
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      ingredientId: "ing-bread",
      unitId: "unit-slice",
      resolvedAmount: 3,
      memberAmounts: [
        { familyMemberId: "family-self", amount: 1 },
        { familyMemberId: "family-member-1", amount: 2 },
      ],
      sourceRecipeIngredientIds: ["ri-bread"],
    });
  });

  it("scales aggregated totals by meal count", () => {
    const sliceUnit = createMockUnit({ id: "unit-slice", name: "slice", namePlural: "slices" });
    const bread = createMockIngredient({
      id: "ing-bread",
      unitConversions: [
        createMockIngredientUnit("ing-bread", "unit-slice", 1, "slice"),
      ],
    });
    const breadRow = createMockRecipeIngredient({
      id: "ri-bread",
      amount: 1,
      nutritionTarget: "BOTH",
      ingredient: bread,
      unit: sliceUnit,
    });

    const lines = resolveCookingAggregatedLines({
      recipeIngredients: [breadRow],
      recipeServings: 1,
      familyMembers,
      cookingFamilyMemberIds: ["family-self", "family-member-1"],
      mealCount: 2,
      audienceMemberIds: familyMembers.map((member) => member.id),
      memberPortions: buildMemberPortionsFromFamily(familyMembers),
    });

    expect(lines[0]?.resolvedAmount).toBe(6);
    expect(lines[0]?.memberAmounts).toEqual([
      { familyMemberId: "family-self", amount: 2 },
      { familyMemberId: "family-member-1", amount: 4 },
    ]);
  });

  it("splits MODIFY substitutions into separate aggregated lines", () => {
    const gramsUnit = createMockUnit({ id: "unit-g", name: "grams" });
    const tunaOil = createMockIngredient({
      id: "ing-tuna-oil",
      name: "Tuna in oil",
      unitConversions: [createMockIngredientUnit("ing-tuna-oil", "unit-g", 1, "grams")],
    });
    const tunaBrine = createMockIngredient({
      id: "ing-tuna-brine",
      name: "Tuna in brine",
      unitConversions: [createMockIngredientUnit("ing-tuna-brine", "unit-g", 1, "grams")],
    });

    const tunaRow = createMockRecipeIngredient({
      id: "ri-tuna",
      amount: 100,
      nutritionTarget: "BOTH",
      ingredient: tunaOil,
      unit: gramsUnit,
      memberAdjustments: [
        {
          familyMemberId: "family-self",
          kind: "MODIFY",
          ingredientId: "ing-tuna-brine",
          amount: 85,
          unitId: "unit-g",
          additionalInfo: null,
        },
      ],
    });

    const lines = resolveCookingAggregatedLines({
      recipeIngredients: [{ ...tunaRow, ingredient: tunaOil }],
      recipeServings: 1,
      familyMembers,
      cookingFamilyMemberIds: ["family-self", "family-member-1"],
      mealCount: 1,
      audienceMemberIds: familyMembers.map((member) => member.id),
      memberPortions: buildMemberPortionsFromFamily(familyMembers),
    });

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      ingredientId: "ing-tuna-brine",
      resolvedAmount: 85,
    });
    expect(lines[1]).toMatchObject({
      ingredientId: "ing-tuna-oil",
      resolvedAmount: 200,
    });
  });

  it("omits SKIP-only rows for all selected eaters", () => {
    const gramsUnit = createMockUnit({ id: "unit-g", name: "grams" });
    const ingredient = createMockIngredient({
      id: "ing-side",
      unitConversions: [createMockIngredientUnit("ing-side", "unit-g", 1, "grams")],
    });
    const nelsonOnlyRow = createMockRecipeIngredient({
      id: "ri-side",
      amount: 100,
      nutritionTarget: "SECONDARY_ONLY",
      ingredient,
      unit: gramsUnit,
    });

    const lines = resolveCookingAggregatedLines({
      recipeIngredients: [nelsonOnlyRow],
      recipeServings: 2,
      familyMembers,
      cookingFamilyMemberIds: ["family-self", "family-member-1"],
      mealCount: 1,
      audienceMemberIds: familyMembers.map((member) => member.id),
      memberPortions: buildMemberPortionsFromFamily(familyMembers),
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]?.ingredientId).toBe("ing-side");
    expect(lines[0]?.resolvedAmount).toBe(100);
  });

  it("merges duplicate ingredient rows within a section", () => {
    const sliceUnit = createMockUnit({ id: "unit-slice", name: "slice", namePlural: "slices" });
    const bread = createMockIngredient({
      id: "ing-bread",
      unitConversions: [
        createMockIngredientUnit("ing-bread", "unit-slice", 1, "slice"),
      ],
    });
    const rowA = createMockRecipeIngredient({
      id: "ri-bread-a",
      amount: 1,
      nutritionTarget: "BOTH",
      ingredient: bread,
      unit: sliceUnit,
    });
    const rowB = createMockRecipeIngredient({
      id: "ri-bread-b",
      position: 1,
      amount: 2,
      nutritionTarget: "BOTH",
      ingredient: bread,
      unit: sliceUnit,
    });

    const lines = resolveCookingAggregatedLines({
      recipeIngredients: [rowA, rowB],
      recipeServings: 1,
      familyMembers,
      cookingFamilyMemberIds: ["family-self"],
      mealCount: 1,
      audienceMemberIds: familyMembers.map((member) => member.id),
      memberPortions: buildMemberPortionsFromFamily(familyMembers),
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]?.resolvedAmount).toBe(3);
    expect(lines[0]?.memberAmounts).toEqual([
      { familyMemberId: "family-self", amount: 3 },
    ]);
    expect(lines[0]?.sourceRecipeIngredientIds).toEqual(["ri-bread-a", "ri-bread-b"]);
  });

  it("scales heterogeneous audiences via perMealAudience (3 J+N + 3 J)", () => {
    const sliceUnit = createMockUnit({ id: "unit-slice", name: "slice", namePlural: "slices" });
    const bread = createMockIngredient({
      id: "ing-bread",
      unitConversions: [
        createMockIngredientUnit("ing-bread", "unit-slice", 1, "slice"),
      ],
    });
    const breadRow = createMockRecipeIngredient({
      id: "ri-bread",
      amount: 1,
      nutritionTarget: "BOTH",
      ingredient: bread,
      unit: sliceUnit,
    });
    const J = "family-self";
    const N = "family-member-1";

    const lines = resolveCookingAggregatedLines({
      recipeIngredients: [breadRow],
      recipeServings: 1,
      familyMembers,
      cookingFamilyMemberIds: [J, N],
      mealCount: 6,
      perMealAudience: [
        [J, N],
        [J, N],
        [J, N],
        [J],
        [J],
        [J],
      ],
      audienceMemberIds: familyMembers.map((member) => member.id),
      memberPortions: buildMemberPortionsFromFamily(familyMembers),
    });

    // J: 6×1, N: 3×2 → total 12
    expect(lines[0]?.resolvedAmount).toBe(12);
    expect(lines[0]?.memberAmounts).toEqual([
      { familyMemberId: J, amount: 6 },
      { familyMemberId: N, amount: 6 },
    ]);
  });

  it("adds anonymous extra portions attributed as COOK_SESSION_EXTRAS_SHARE_ID", () => {
    const sliceUnit = createMockUnit({ id: "unit-slice", name: "slice", namePlural: "slices" });
    const bread = createMockIngredient({
      id: "ing-bread",
      unitConversions: [
        createMockIngredientUnit("ing-bread", "unit-slice", 1, "slice"),
      ],
    });
    const breadRow = createMockRecipeIngredient({
      id: "ri-bread",
      amount: 1,
      nutritionTarget: "BOTH",
      ingredient: bread,
      unit: sliceUnit,
    });
    const J = "family-self";
    const N = "family-member-1";

    const lines = resolveCookingAggregatedLines({
      recipeIngredients: [breadRow],
      recipeServings: 1,
      familyMembers,
      cookingFamilyMemberIds: [J, N],
      mealCount: 6,
      perMealAudience: [
        [J, N],
        [J, N],
        [J, N],
        [J],
        [J],
        [J],
      ],
      extraPortions: 2,
      audienceMemberIds: familyMembers.map((member) => member.id),
      memberPortions: buildMemberPortionsFromFamily(familyMembers),
    });

    expect(lines[0]?.resolvedAmount).toBe(14);
    expect(lines[0]?.memberAmounts).toEqual([
      { familyMemberId: J, amount: 6 },
      { familyMemberId: N, amount: 6 },
      { familyMemberId: COOK_SESSION_EXTRAS_SHARE_ID, amount: 2 },
    ]);
  });

  it("scales MODIFY amounts by that person's meal count only", () => {
    const gramsUnit = createMockUnit({ id: "unit-g", name: "grams" });
    const tunaOil = createMockIngredient({
      id: "ing-tuna-oil",
      name: "Tuna in oil",
      unitConversions: [createMockIngredientUnit("ing-tuna-oil", "unit-g", 1, "grams")],
    });
    const tunaBrine = createMockIngredient({
      id: "ing-tuna-brine",
      name: "Tuna in brine",
      unitConversions: [createMockIngredientUnit("ing-tuna-brine", "unit-g", 1, "grams")],
    });
    const J = "family-self";
    const N = "family-member-1";

    const tunaRow = createMockRecipeIngredient({
      id: "ri-tuna",
      amount: 100,
      nutritionTarget: "BOTH",
      ingredient: tunaOil,
      unit: gramsUnit,
      memberAdjustments: [
        {
          familyMemberId: J,
          kind: "MODIFY",
          ingredientId: "ing-tuna-brine",
          amount: 85,
          unitId: "unit-g",
          additionalInfo: null,
        },
      ],
    });

    const lines = resolveCookingAggregatedLines({
      recipeIngredients: [{ ...tunaRow, ingredient: tunaOil }],
      recipeServings: 1,
      familyMembers,
      cookingFamilyMemberIds: [J, N],
      mealCount: 6,
      personMealCounts: new Map([
        [J, 6],
        [N, 3],
      ]),
      audienceMemberIds: familyMembers.map((member) => member.id),
      memberPortions: buildMemberPortionsFromFamily(familyMembers),
    });

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      ingredientId: "ing-tuna-brine",
      resolvedAmount: 85 * 6,
    });
    // N ×2 multiplier × 3 meals × 100 batch / 1 serving
    expect(lines[1]).toMatchObject({
      ingredientId: "ing-tuna-oil",
      resolvedAmount: 600,
    });
  });
});
