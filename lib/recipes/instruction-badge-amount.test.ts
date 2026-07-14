import { describe, expect, it } from "vitest";
import { getInstructionIngredientBadgeAmount } from "./helpers";

const familyMembers = [
  { id: "family-self", name: "Jagoda", isSelf: true, sortOrder: 0 },
  { id: "family-member-1", name: "Nelson", isSelf: false, sortOrder: 1 },
];

const memberPortions = [
  { familyMemberId: "family-member-1", multiplier: 2 },
];

const cookingFamilyMemberIds = ["family-self", "family-member-1"];
const audienceMemberIds = cookingFamilyMemberIds;
const baseServings = 2;

describe("getInstructionIngredientBadgeAmount", () => {
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
        recipeServings: baseServings * 2,
        rowScaleFactor: 2,
      }),
    ).toBe(600);
  });

  it("returns per-meal share for the selected person on a scaled batch", () => {
    expect(
      getInstructionIngredientBadgeAmount({
        amount: 300,
        memberAdjustments: [],
        audienceMemberIds,
        selectedFamilyMemberId: "family-self",
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds,
        recipeServings: baseServings * 2,
        rowScaleFactor: 2,
      }),
    ).toBe(150);
  });

  it("applies portion multiplier when calorie scale is not applied", () => {
    expect(
      getInstructionIngredientBadgeAmount({
        amount: 300,
        memberAdjustments: [],
        audienceMemberIds,
        selectedFamilyMemberId: "family-member-1",
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds,
        recipeServings: baseServings,
        rowScaleFactor: 1,
      }),
    ).toBe(300);
  });

  it("uses display servings so scaled batches still resolve per meal", () => {
    // 300g row at 2 base servings, scaled to 6 servings => 900g total batch.
    expect(
      getInstructionIngredientBadgeAmount({
        amount: 300,
        memberAdjustments: [],
        audienceMemberIds,
        selectedFamilyMemberId: "family-self",
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds,
        recipeServings: baseServings * 3,
        rowScaleFactor: 3,
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
        recipeServings: baseServings * 3,
        rowScaleFactor: 3,
      }),
    ).toBe(300);
  });
});
