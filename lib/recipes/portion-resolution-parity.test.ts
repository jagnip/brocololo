import { describe, expect, it } from "vitest";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { getFamilyMemberIngredientAmountPerMeal } from "@/lib/log/helpers";
import {
  buildPortionSizeSummaryRows,
  resolveConsumableIngredientLine,
  resolveRecipeIngredientRowsForMember,
} from "@/lib/recipes/ingredient-adjustments";

/**
 * Cross-path parity tests for per-person portion math.
 *
 * Model (see lib/log/helpers.ts):
 * - `amount` = total batch on the recipe row
 * - `servings` = how many meals the batch covers
 * - Each person: (batch ÷ servings) × portionMultiplier — independent, not a weighted split
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
  expect(paths.fromConsumable.jagoda).toBeCloseTo(fixture.expected.jagoda, 3);
  expect(paths.fromConsumable.nelson).toBeCloseTo(fixture.expected.nelson, 3);
  expect(paths.fromLogPool[0]?.amount).toBeCloseTo(fixture.expected.nelson, 3);

  const jagodaRow = paths.fromPeoplePanel.find((r) => r.familyMemberId === "fm-jagoda");
  const nelsonRow = paths.fromPeoplePanel.find((r) => r.familyMemberId === "fm-nelson");
  expect(parseAmountFromShareDetail(jagodaRow?.shareDetail)).toBeCloseTo(
    fixture.expected.jagoda,
    2,
  );
  expect(parseAmountFromShareDetail(nelsonRow?.shareDetail)).toBeCloseTo(
    fixture.expected.nelson,
    2,
  );

  // Nelson always gets twice Jagoda's share when multipliers are 1 and 2.
  expect(paths.fromCore.nelson).toBeCloseTo((paths.fromCore.jagoda ?? 0) * 2, 4);
}

describe("portion resolution parity (core, consumable, log pool, people panel)", () => {
  it("bread: 3 slices batch, 2 servings → Jagoda 1.5, Nelson 3 per meal", () => {
    expectParity({
      label: "3 slices / 2 servings",
      batchAmount: 3,
      servings: 2,
      expected: { jagoda: 1.5, nelson: 3 },
    });
  });

  it("bread: 2 slices batch, 2 servings → Jagoda 1, Nelson 2 per meal", () => {
    expectParity({
      label: "2 slices / 2 servings",
      batchAmount: 2,
      servings: 2,
      expected: { jagoda: 1, nelson: 2 },
    });
  });

  it("bread: 3 slices batch, 1 serving → Jagoda 3, Nelson 6 per meal", () => {
    expectParity({
      label: "3 slices / 1 serving",
      batchAmount: 3,
      servings: 1,
      expected: { jagoda: 3, nelson: 6 },
    });
  });

  it("bread: 6 slices batch, 4 servings → Jagoda 1.5, Nelson 3 per meal", () => {
    expectParity({
      label: "6 slices / 4 servings",
      batchAmount: 6,
      servings: 4,
      expected: { jagoda: 1.5, nelson: 3 },
    });
  });

  it("tuna: 85g batch, 2 servings → Jagoda 42.5g, Nelson 85g", () => {
    expectParity({
      label: "85g tuna / 2 servings",
      batchAmount: 85,
      servings: 2,
      expected: { jagoda: 42.5, nelson: 85 },
    });
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

    expect(nelsonFromCore).toBeCloseTo(85, 4);
    expect(nelsonFromPool[0]?.amount).toBeCloseTo(nelsonFromCore ?? 0, 3);
    expect(parseAmountFromShareDetail(nelsonFromPanel[0]?.shareDetail)).toBeCloseTo(
      nelsonFromCore ?? 0,
      2,
    );
  });
});
