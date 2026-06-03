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

describe("getInstructionIngredientBadgeAmount", () => {
  it("returns scaled row amount when no person is selected", () => {
    expect(
      getInstructionIngredientBadgeAmount({
        amount: 300,
        selectedFamilyMemberId: null,
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds,
        appliesToEveryone: true,
        targetFamilyMemberIds: [],
        rowScaleFactor: 2,
      }),
    ).toBe(600);
  });

  it("splits scaled shared rows for the selected person", () => {
    expect(
      getInstructionIngredientBadgeAmount({
        amount: 300,
        selectedFamilyMemberId: "family-self",
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds,
        appliesToEveryone: true,
        targetFamilyMemberIds: [],
        rowScaleFactor: 2,
      }),
    ).toBe(200);
  });

  it("splits unscaled shared rows when calorie scale is not applied", () => {
    expect(
      getInstructionIngredientBadgeAmount({
        amount: 300,
        selectedFamilyMemberId: "family-member-1",
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds,
        appliesToEveryone: true,
        targetFamilyMemberIds: [],
        rowScaleFactor: 1,
      }),
    ).toBe(200);
  });

  it("uses the full scaled batch at high servings, not one plate", () => {
    // 300g row at 2 base servings, scaled to 6 servings => 900g total batch.
    expect(
      getInstructionIngredientBadgeAmount({
        amount: 300,
        selectedFamilyMemberId: "family-self",
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds,
        appliesToEveryone: true,
        targetFamilyMemberIds: [],
        rowScaleFactor: 3,
      }),
    ).toBe(300);
    expect(
      getInstructionIngredientBadgeAmount({
        amount: 300,
        selectedFamilyMemberId: "family-member-1",
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds,
        appliesToEveryone: true,
        targetFamilyMemberIds: [],
        rowScaleFactor: 3,
      }),
    ).toBe(600);
  });
});
