import { describe, expect, it } from "vitest";
import {
  getInstructionIngredientBadgeAmount,
  isInstructionIngredientVisibleForPerson,
} from "../recipes/helpers";

const familyMembers = [
  { id: "family-self", isSelf: true },
  { id: "family-member-1", isSelf: false },
];

const memberPortions = [{ familyMemberId: "family-member-1", multiplier: 2 }];
const cookingFamilyMemberIds = ["family-self", "family-member-1"];
const audienceMemberIds = cookingFamilyMemberIds;

const sharedRow = { memberAdjustments: [] as const };
const selfOnlyRow = {
  memberAdjustments: [{ familyMemberId: "family-member-1", kind: "SKIP" as const }],
};
const partnerOnlyRow = {
  memberAdjustments: [{ familyMemberId: "family-self", kind: "SKIP" as const }],
};

describe("instruction person filter visibility", () => {
  it("shows all targets when no person is selected", () => {
    expect(isInstructionIngredientVisibleForPerson(sharedRow, null)).toBe(true);
    expect(isInstructionIngredientVisibleForPerson(selfOnlyRow, null)).toBe(true);
    expect(isInstructionIngredientVisibleForPerson(partnerOnlyRow, null)).toBe(true);
  });

  it("shows shared and self-only rows for the account holder", () => {
    expect(isInstructionIngredientVisibleForPerson(sharedRow, "family-self")).toBe(true);
    expect(isInstructionIngredientVisibleForPerson(selfOnlyRow, "family-self")).toBe(true);
    expect(isInstructionIngredientVisibleForPerson(partnerOnlyRow, "family-self")).toBe(false);
  });

  it("shows shared and partner-only rows for the partner", () => {
    expect(isInstructionIngredientVisibleForPerson(sharedRow, "family-member-1")).toBe(true);
    expect(isInstructionIngredientVisibleForPerson(selfOnlyRow, "family-member-1")).toBe(false);
    expect(isInstructionIngredientVisibleForPerson(partnerOnlyRow, "family-member-1")).toBe(true);
  });
});

describe("instruction person filter badge amounts", () => {
  it("returns scaled row amount when no person is selected", () => {
    expect(
      getInstructionIngredientBadgeAmount({
        amount: 300,
        memberAdjustments: [],
        audienceMemberIds,
        selectedFamilyMemberId: null,
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds,
        recipeServings: 4,
        rowScaleFactor: 2,
      }),
    ).toBe(600);
  });

  it("returns full scaled amount for person-specific rows", () => {
    expect(
      getInstructionIngredientBadgeAmount({
        amount: 100,
        memberAdjustments: selfOnlyRow.memberAdjustments,
        audienceMemberIds,
        selectedFamilyMemberId: "family-self",
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds,
        recipeServings: 1,
        rowScaleFactor: 1,
      }),
    ).toBe(100);
  });

  it("returns per-meal share for shared rows", () => {
    expect(
      getInstructionIngredientBadgeAmount({
        amount: 300,
        memberAdjustments: [],
        audienceMemberIds,
        selectedFamilyMemberId: "family-self",
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds,
        recipeServings: 2,
        rowScaleFactor: 1,
      }),
    ).toBe(150);
    expect(
      getInstructionIngredientBadgeAmount({
        amount: 300,
        memberAdjustments: [],
        audienceMemberIds,
        selectedFamilyMemberId: "family-member-1",
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds,
        recipeServings: 2,
        rowScaleFactor: 1,
      }),
    ).toBe(300);
  });
});
