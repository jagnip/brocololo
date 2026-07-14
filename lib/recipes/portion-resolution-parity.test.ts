import { describe, expect, it } from "vitest";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { getFamilyMemberIngredientAmountPerMeal } from "@/lib/log/helpers";
import {
  buildPortionSizeSummaryRows,
  resolveConsumableIngredientLine,
  resolveRecipeIngredientRowsForMember,
} from "@/lib/recipes/ingredient-adjustments";

/**
 * Cross-path parity tests for shared-ingredient portion math.
 *
 * Model (see lib/log/helpers.ts):
 * - `amount` = total batch on the recipe row
 * - `servings` = how many household meals the batch covers (plate-count yield)
 * - One meal consumes: batch × audienceCount ÷ servings (before multiplier split)
 * - Each person: (batch × audienceCount × multiplier) ÷ (servings × sumOfMultipliers)
 */

const familyMembers: FamilyMemberRow[] = [
  { id: "fm-jagoda", name: "Jagoda", isSelf: true, sortOrder: 0 },
  { id: "fm-nelson", name: "Nelson", isSelf: false, sortOrder: 1 },
];

const audienceMemberIds = ["fm-jagoda", "fm-nelson"];
const memberPortions = [{ familyMemberId: "fm-nelson", multiplier: 2 }];
const familyMembersForPortion = familyMembers.map((m) => ({
  id: m.id,
  isSelf: m.isSelf,
}));

function parseAmountFromShareDetail(detail: string | null | undefined): number {
  return parseFloat(detail?.split(" ")[0] ?? "0");
}

type PortionFixture = {
  label: string;
  batchAmount: number;
  servings: number;
  expected: { jagoda: number; nelson: number };
};

/** Shared resolver inputs for one ingredient row. */
function resolveAllPaths(fixture: PortionFixture) {
  const coreParams = {
    amount: fixture.batchAmount,
    appliesToEveryone: true,
    targetFamilyMemberIds: [] as string[],
    recipeServings: fixture.servings,
    familyMembers: familyMembersForPortion,
    memberPortions,
    cookingFamilyMemberIds: audienceMemberIds,
    recipeAudienceFamilyMemberIds: audienceMemberIds,
  };

  const fromCore = {
    jagoda: getFamilyMemberIngredientAmountPerMeal({
      ...coreParams,
      familyMemberId: "fm-jagoda",
    }),
    nelson: getFamilyMemberIngredientAmountPerMeal({
      ...coreParams,
      familyMemberId: "fm-nelson",
    }),
  };

  const row = {
    id: "ri-bread",
    ingredientId: "ing-bread",
    amount: fixture.batchAmount,
    unitId: "unit-slice",
    additionalInfo: null,
    memberAdjustments: [] as [],
  };

  const fromConsumable = {
    jagoda: resolveConsumableIngredientLine({
      row,
      familyMemberId: "fm-jagoda",
      recipeServings: fixture.servings,
      familyMembers: familyMembersForPortion,
      memberPortions,
      cookingFamilyMemberIds: audienceMemberIds,
      recipeAudienceFamilyMemberIds: audienceMemberIds,
    })?.amount ?? null,
    nelson: resolveConsumableIngredientLine({
      row,
      familyMemberId: "fm-nelson",
      recipeServings: fixture.servings,
      familyMembers: familyMembersForPortion,
      memberPortions,
      cookingFamilyMemberIds: audienceMemberIds,
      recipeAudienceFamilyMemberIds: audienceMemberIds,
    })?.amount ?? null,
  };

  const fromLogPool = resolveRecipeIngredientRowsForMember({
    recipeIngredients: [
      {
        id: row.id,
        ingredientId: row.ingredientId,
        amount: row.amount,
        unit: { id: row.unitId },
        additionalInfo: row.additionalInfo,
        memberAdjustments: row.memberAdjustments,
      },
    ],
    familyMemberId: "fm-nelson",
    recipeServings: fixture.servings,
    familyMembers: familyMembersForPortion,
    memberPortions,
    audienceMemberIds,
  });

  const fromPeoplePanel = buildPortionSizeSummaryRows({
    familyMembers,
    audienceMemberIds,
    memberPortions,
    baseIngredientId: "ing-bread",
    batchAmount: fixture.batchAmount,
    batchUnitId: "unit-slice",
    memberAdjustments: [],
    servings: fixture.servings,
    unitsById: new Map([
      ["unit-slice", { id: "unit-slice", name: "slice", namePlural: "slices" }],
    ]),
  });

  return { fromCore, fromConsumable, fromLogPool, fromPeoplePanel };
}

function expectParity(fixture: PortionFixture) {
  const paths = resolveAllPaths(fixture);

  expect(paths.fromCore.jagoda).toBeCloseTo(fixture.expected.jagoda, 4);
  expect(paths.fromCore.nelson).toBeCloseTo(fixture.expected.nelson, 4);
  // resolveConsumableIngredientLine rounds to 3 decimal places
  expect(paths.fromConsumable.jagoda).toBeCloseTo(fixture.expected.jagoda, 3);
  expect(paths.fromConsumable.nelson).toBeCloseTo(fixture.expected.nelson, 3);
  expect(paths.fromLogPool[0]?.amount).toBeCloseTo(fixture.expected.nelson, 3);

  const jagodaRow = paths.fromPeoplePanel.find((r) => r.familyMemberId === "fm-jagoda");
  const nelsonRow = paths.fromPeoplePanel.find((r) => r.familyMemberId === "fm-nelson");
  // shareDetail is formatted for display (2 dp)
  expect(parseAmountFromShareDetail(jagodaRow?.shareDetail)).toBeCloseTo(
    fixture.expected.jagoda,
    2,
  );
  expect(parseAmountFromShareDetail(nelsonRow?.shareDetail)).toBeCloseTo(
    fixture.expected.nelson,
    2,
  );

  // Per-meal household total = batch × audience ÷ servings
  const perMealTotal =
    (fixture.batchAmount * audienceMemberIds.length) / fixture.servings;
  expect(
    (paths.fromCore.jagoda ?? 0) + (paths.fromCore.nelson ?? 0),
  ).toBeCloseTo(perMealTotal, 4);

  // Nelson always gets twice Jagoda's share when multipliers are 1 and 2
  expect(paths.fromCore.nelson).toBeCloseTo((paths.fromCore.jagoda ?? 0) * 2, 4);
}

describe("portion resolution parity (core, consumable, log pool, people panel)", () => {
  it("bread: 3 slices batch, 2 servings → Jagoda 1, Nelson 2 per meal", () => {
    // This is the case where 1× + 2× yields whole-number slices.
    expectParity({
      label: "3 slices / 2 servings",
      batchAmount: 3,
      servings: 2,
      expected: { jagoda: 1, nelson: 2 },
    });
  });

  it("bread: 2 slices batch, 2 servings → Jagoda 0.67, Nelson 1.33 per meal", () => {
    // Same ratio (1:2) but only 2 slices consumed per meal total, not 3.
    expectParity({
      label: "2 slices / 2 servings",
      batchAmount: 2,
      servings: 2,
      expected: { jagoda: 2 / 3, nelson: 4 / 3 },
    });
  });

  it("bread: 3 slices batch, 1 serving → Jagoda 2, Nelson 4 per meal (whole batch × audience)", () => {
    // servings=1 with 2-person audience: one meal uses batch × audienceCount = 6 slice-units total
    expectParity({
      label: "3 slices / 1 serving",
      batchAmount: 3,
      servings: 1,
      expected: { jagoda: 2, nelson: 4 },
    });
  });

  it("bread: 6 slices batch, 4 servings → Jagoda 1, Nelson 2 per meal", () => {
    // 6 × 2 ÷ 4 = 3 slices per meal household total
    expectParity({
      label: "6 slices / 4 servings",
      batchAmount: 6,
      servings: 4,
      expected: { jagoda: 1, nelson: 2 },
    });
  });

  it("tuna: 85g batch, 2 servings matches log pool (56.67g for Nelson ×2)", () => {
    const fixture: PortionFixture = {
      label: "85g tuna / 2 servings",
      batchAmount: 85,
      servings: 2,
      // Per meal household total = 85g; split 1:2 → 28.33g + 56.67g
      expected: { jagoda: 85 / 3, nelson: (85 * 2) / 3 },
    };
    expectParity(fixture);
  });
});

describe("portion resolution with Jagoda MODIFY (Nelson uses default split)", () => {
  const memberAdjustments = [
    {
      familyMemberId: "fm-jagoda",
      kind: "MODIFY" as const,
      ingredientId: "ing-brine",
      amount: 42.5,
      unitId: "unit-g",
    },
  ];

  it("Nelson share matches across core and log pool when Jagoda has MODIFY", () => {
    const nelsonFromCore = getFamilyMemberIngredientAmountPerMeal({
      amount: 85,
      memberAdjustments,
      familyMemberId: "fm-nelson",
      recipeServings: 2,
      familyMembers: familyMembersForPortion,
      memberPortions,
      cookingFamilyMemberIds: audienceMemberIds,
      recipeAudienceFamilyMemberIds: audienceMemberIds,
    });

    const nelsonFromPool = resolveRecipeIngredientRowsForMember({
      recipeIngredients: [
        {
          id: "ri-tuna",
          ingredientId: "ing-tuna",
          amount: 85,
          unit: { id: "unit-g" },
          additionalInfo: null,
          memberAdjustments,
        },
      ],
      familyMemberId: "fm-nelson",
      recipeServings: 2,
      familyMembers: familyMembersForPortion,
      memberPortions,
      audienceMemberIds,
    });

    const nelsonFromPanel = buildPortionSizeSummaryRows({
      familyMembers,
      audienceMemberIds,
      memberPortions,
      baseIngredientId: "ing-tuna",
      batchAmount: 85,
      batchUnitId: "unit-g",
      memberAdjustments,
      servings: 2,
      unitsById: new Map([["unit-g", { id: "unit-g", name: "g", namePlural: null }]]),
      excludeAdjustedMemberIds: ["fm-jagoda"],
    });

    expect(nelsonFromCore).toBeCloseTo((85 * 2 * 2) / (2 * 3), 4);
    expect(nelsonFromPool[0]?.amount).toBeCloseTo(nelsonFromCore ?? 0, 3);
    expect(parseAmountFromShareDetail(nelsonFromPanel[0]?.shareDetail)).toBeCloseTo(
      nelsonFromCore ?? 0,
      2,
    );
  });
});
