import { describe, expect, it } from "vitest";
import {
  buildAdjustmentSummaryLines,
  buildDefaultModifyAdjustment,
  buildPortionSizeSummaryRows,
  formatDefaultPerPersonHint,
  formatPortionMultiplierBadgeLabel,
  getDefaultPerPersonAmount,
  shouldShowPortionShareSummary,
  getDefaultPerPersonAmountForMember,
  getMemberAdjustmentCount,
  resolveConsumableIngredientLine,
  resolveRecipeIngredientRowsForMember,
} from "@/lib/recipes/ingredient-adjustments";
import { calculateNutritionPerServing } from "@/lib/recipes/helpers";
import {
  createMockIngredient,
  createMockIngredientUnit,
  createMockRecipe,
  createMockRecipeIngredient,
  createMockUnit,
} from "@/lib/tests/test-helpers";
import type { FamilyMemberRow } from "@/lib/db/family-members";

const familyMembers: FamilyMemberRow[] = [
  { id: "fm-jagoda", name: "Jagoda", isSelf: true, sortOrder: 0 },
  { id: "fm-nelson", name: "Nelson", isSelf: false, sortOrder: 1 },
];

describe("ingredient-adjustments helpers", () => {
  it("computes default per-person amount from batch and servings", () => {
    expect(getDefaultPerPersonAmount(50, 4)).toBe(12.5);
    expect(getDefaultPerPersonAmountForMember(50, 4, 2)).toBe(25);
    expect(formatDefaultPerPersonHint({
      batchAmount: 50,
      unitName: "g",
      servings: 4,
    })).toBe("50g ÷ 4 = 12.5g default per person");
  });

  it("formats portion multiplier badges", () => {
    expect(formatPortionMultiplierBadgeLabel(1)).toBeNull();
    expect(formatPortionMultiplierBadgeLabel(2)).toBe("×2");
    expect(formatPortionMultiplierBadgeLabel(1.5)).toBe("×1.5");
  });

  it("builds portion size summary rows with per-meal share amounts", () => {
    const unitsById = new Map([
      ["unit-g", { id: "unit-g", name: "g", namePlural: null }],
    ]);
    const rows = buildPortionSizeSummaryRows({
      familyMembers,
      audienceMemberIds: ["fm-jagoda", "fm-nelson"],
      memberPortions: [{ familyMemberId: "fm-nelson", multiplier: 2 }],
      baseIngredientId: "ing-tuna",
      batchAmount: 85,
      batchUnitId: "unit-g",
      memberAdjustments: [],
      servings: 2,
      unitsById,
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      personLabel: "Jagoda",
      portionBadgeLabel: null,
      shareDetail: "42.5 g",
    });
    expect(rows[1]).toMatchObject({
      personLabel: "Nelson",
      portionBadgeLabel: "×2",
      shareDetail: "85 g",
    });

    const nelsonOnly = buildPortionSizeSummaryRows({
      familyMembers,
      audienceMemberIds: ["fm-jagoda", "fm-nelson"],
      memberPortions: [{ familyMemberId: "fm-nelson", multiplier: 2 }],
      baseIngredientId: "ing-tuna",
      batchAmount: 85,
      batchUnitId: "unit-g",
      memberAdjustments: [
        {
          familyMemberId: "fm-jagoda",
          kind: "MODIFY",
          ingredientId: "ing-brine",
          amount: 42.5,
          unitId: "unit-g",
        },
      ],
      servings: 2,
      unitsById,
      excludeAdjustedMemberIds: ["fm-jagoda"],
    });
    expect(nelsonOnly).toHaveLength(1);
    expect(nelsonOnly[0]?.personLabel).toBe("Nelson");
    expect(nelsonOnly[0]?.shareDetail).toBe("85 g");

    const poolRows = resolveRecipeIngredientRowsForMember({
      recipeIngredients: [
        {
          id: "ri-tuna",
          ingredientId: "ing-tuna",
          amount: 85,
          unit: { id: "unit-g" },
          additionalInfo: null,
          memberAdjustments: [
            {
              familyMemberId: "fm-jagoda",
              kind: "MODIFY",
              ingredientId: "ing-brine",
              amount: 42.5,
              unitId: "unit-g",
            },
          ],
        },
      ],
      familyMemberId: "fm-nelson",
      recipeServings: 2,
      familyMembers,
      memberPortions: [{ familyMemberId: "fm-nelson", multiplier: 2 }],
      audienceMemberIds: ["fm-jagoda", "fm-nelson"],
    });
    expect(poolRows[0]?.amount).toBeCloseTo(85, 2);
    expect(nelsonOnly[0]?.shareDetail).toBe("85 g");

    expect(
      shouldShowPortionShareSummary({
        audienceMemberIds: ["fm-jagoda", "fm-nelson"],
        batchAmount: 85,
        batchUnitId: "unit-g",
        memberAdjustments: [
          { familyMemberId: "fm-jagoda", kind: "MODIFY", ingredientId: "ing-1" },
        ],
      }),
    ).toBe(true);
    expect(
      shouldShowPortionShareSummary({
        audienceMemberIds: ["fm-jagoda"],
        batchAmount: 85,
        batchUnitId: "unit-g",
        memberAdjustments: [],
      }),
    ).toBe(false);
  });

  it("builds MODIFY adjustment defaults from base row", () => {
    const adjustment = buildDefaultModifyAdjustment({
      familyMemberId: "fm-jagoda",
      baseIngredientId: "ing-butter",
      baseAmount: 50,
      baseUnitId: "unit-g",
      servings: 4,
    });
    expect(adjustment).toMatchObject({
      familyMemberId: "fm-jagoda",
      kind: "MODIFY",
      ingredientId: "ing-butter",
      amount: 12.5,
      unitId: "unit-g",
    });
  });

  it("prefills MODIFY amount from batch ÷ servings × portion multiplier", () => {
    const adjustment = buildDefaultModifyAdjustment({
      familyMemberId: "fm-nelson",
      baseIngredientId: "ing-butter",
      baseAmount: 50,
      baseUnitId: "unit-g",
      servings: 4,
      memberPortions: [{ familyMemberId: "fm-nelson", multiplier: 2 }],
    });
    expect(adjustment.amount).toBe(25);
  });

  it("resolves SKIP as null consumable line", () => {
    const line = resolveConsumableIngredientLine({
      row: {
        id: "ri-1",
        ingredientId: "ing-butter",
        amount: 50,
        unitId: "unit-g",
        additionalInfo: null,
        memberAdjustments: [
          { familyMemberId: "fm-nelson", kind: "SKIP" },
        ],
      },
      familyMemberId: "fm-nelson",
      recipeServings: 4,
      familyMembers,
      memberPortions: [],
      recipeAudienceFamilyMemberIds: ["fm-jagoda", "fm-nelson"],
    });
    expect(line).toBeNull();
  });

  it("resolves MODIFY substitute ingredient and amount", () => {
    const line = resolveConsumableIngredientLine({
      row: {
        id: "ri-1",
        ingredientId: "ing-butter",
        amount: 50,
        unitId: "unit-g",
        additionalInfo: null,
        memberAdjustments: [
          {
            familyMemberId: "fm-jagoda",
            kind: "MODIFY",
            ingredientId: "ing-olive-oil",
            amount: 12.5,
            unitId: "unit-g",
          },
        ],
      },
      familyMemberId: "fm-jagoda",
      recipeServings: 4,
      familyMembers,
      memberPortions: [],
      recipeAudienceFamilyMemberIds: ["fm-jagoda", "fm-nelson"],
    });
    expect(line).toEqual({
      ingredientId: "ing-olive-oil",
      unitId: "unit-g",
      amount: 12.5,
    });
  });

  it("builds summary lines for modify and skip adjustments", () => {
    const lines = buildAdjustmentSummaryLines({
      memberAdjustments: [
        {
          familyMemberId: "fm-jagoda",
          kind: "MODIFY",
          ingredientId: "ing-olive-oil",
          amount: 12.5,
          unitId: "unit-g",
        },
        { familyMemberId: "fm-nelson", kind: "SKIP" },
      ],
      familyMembers,
      ingredientCatalog: new Map([
        [
          "ing-olive-oil",
          { id: "ing-olive-oil", name: "Olive oil", brand: null, descriptor: null },
        ],
      ]),
      unitsById: new Map([["unit-g", { id: "unit-g", name: "g", namePlural: null }]]),
      servings: 4,
      baseIngredientId: "ing-butter",
      batchAmount: 50,
      batchUnitId: "unit-g",
      audienceMemberIds: ["fm-jagoda", "fm-nelson"],
    });

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      personLabel: "Jagoda",
      kind: "MODIFY",
      detail: expect.stringContaining("Olive oil"),
      adjustmentBadgeLabel: "Custom",
      portionBadgeLabel: null,
    });
    expect(lines[1]).toMatchObject({
      personLabel: "Nelson",
      kind: "SKIP",
      detail: "Not in their portion",
      adjustmentBadgeLabel: "Skipped",
    });
  });

  it("shows portion badge when multipliers differ from 1×", () => {
    const lines = buildAdjustmentSummaryLines({
      memberAdjustments: [
        {
          familyMemberId: "fm-nelson",
          kind: "MODIFY",
          ingredientId: "ing-bread",
          amount: 5,
          unitId: "unit-slice",
        },
      ],
      familyMembers,
      ingredientCatalog: new Map([
        ["ing-bread", { id: "ing-bread", name: "Bread", brand: null, descriptor: null }],
      ]),
      unitsById: new Map([
        ["unit-slice", { id: "unit-slice", name: "slice", namePlural: "slices" }],
      ]),
      servings: 2,
      baseIngredientId: "ing-bread",
      batchAmount: 3,
      batchUnitId: "unit-slice",
      memberPortions: [{ familyMemberId: "fm-nelson", multiplier: 2 }],
      audienceMemberIds: ["fm-jagoda", "fm-nelson"],
    });

    expect(lines[0]?.portionBadgeLabel).toBe("×2");
  });

  it("counts member adjustments for collapsed badge", () => {
    expect(
      getMemberAdjustmentCount([
        { familyMemberId: "fm-jagoda", kind: "MODIFY", ingredientId: "ing-1" },
      ]),
    ).toBe(1);
  });

  it("resolves rows for each eater via resolveRecipeIngredientRowsForMember", () => {
    const rows = resolveRecipeIngredientRowsForMember({
      recipeIngredients: [
        {
          id: "ri-1",
          ingredientId: "ing-butter",
          amount: 40,
          unit: { id: "unit-g" },
          additionalInfo: null,
          memberAdjustments: [
            {
              familyMemberId: "fm-jagoda",
              kind: "MODIFY",
              ingredientId: "ing-olive-oil",
              amount: 10,
              unitId: "unit-g",
            },
            { familyMemberId: "fm-nelson", kind: "SKIP" },
          ],
        },
      ],
      familyMemberId: "fm-jagoda",
      recipeServings: 2,
      familyMembers,
      memberPortions: [],
      audienceMemberIds: ["fm-jagoda", "fm-nelson"],
    });

    expect(rows).toEqual([
      { ingredientId: "ing-olive-oil", unitId: "unit-g", amount: 10 },
    ]);
  });

  it("keeps non-zero nutrition for nelson-targeted fixture rows", () => {
    const gramsUnit = createMockUnit({ id: "unit-grams", name: "grams" });
    const sharedProtein = createMockIngredient({
      id: "ing-shared",
      calories: 100,
      unitConversions: [createMockIngredientUnit("ing-shared", "unit-grams", 1)],
    });
    const sideSauce = createMockIngredient({
      id: "ing-sauce",
      calories: 80,
      unitConversions: [createMockIngredientUnit("ing-sauce", "unit-grams", 1)],
    });
    const sharedRow = createMockRecipeIngredient({
      id: "ri-shared",
      amount: 300,
      nutritionTarget: "BOTH",
      ingredient: sharedProtein,
      unit: gramsUnit,
    });
    const sauceRow = createMockRecipeIngredient({
      id: "ri-sauce",
      amount: 100,
      nutritionTarget: "SECONDARY_ONLY",
      ingredient: sideSauce,
      unit: gramsUnit,
    });
    const recipe = createMockRecipe({
      servings: 2,
      memberPortions: [
        { recipeId: "recipe-1", familyMemberId: "family-member-1", multiplier: 2 },
      ],
      ingredients: [sharedRow, sauceRow],
    });
    const nutrition = calculateNutritionPerServing(recipe, "family-member-1", [
      { id: "family-self", isSelf: true },
      { id: "family-member-1", isSelf: false },
    ]);
    expect(nutrition.calories).toBeGreaterThan(0);
  });
});
