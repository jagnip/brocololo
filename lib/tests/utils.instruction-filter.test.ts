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

describe("instruction person filter visibility", () => {
  it("shows all targets when no person is selected", () => {
    expect(
      isInstructionIngredientVisibleForPerson(true, [], null),
    ).toBe(true);
    expect(
      isInstructionIngredientVisibleForPerson(false, ["family-self"], null),
    ).toBe(true);
    expect(
      isInstructionIngredientVisibleForPerson(
        false,
        ["family-member-1"],
        null,
      ),
    ).toBe(true);
  });

  it("shows shared and self-only rows for the account holder", () => {
    expect(
      isInstructionIngredientVisibleForPerson(true, [], "family-self"),
    ).toBe(true);
    expect(
      isInstructionIngredientVisibleForPerson(
        false,
        ["family-self"],
        "family-self",
      ),
    ).toBe(true);
    expect(
      isInstructionIngredientVisibleForPerson(
        false,
        ["family-member-1"],
        "family-self",
      ),
    ).toBe(false);
  });

  it("shows shared and partner-only rows for the partner", () => {
    expect(
      isInstructionIngredientVisibleForPerson(true, [], "family-member-1"),
    ).toBe(true);
    expect(
      isInstructionIngredientVisibleForPerson(
        false,
        ["family-self"],
        "family-member-1",
      ),
    ).toBe(false);
    expect(
      isInstructionIngredientVisibleForPerson(
        false,
        ["family-member-1"],
        "family-member-1",
      ),
    ).toBe(true);
  });
});

describe("instruction person filter badge amounts", () => {
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

  it("returns full scaled amount for person-specific rows", () => {
    expect(
      getInstructionIngredientBadgeAmount({
        amount: 100,
        selectedFamilyMemberId: "family-self",
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds,
        appliesToEveryone: false,
        targetFamilyMemberIds: ["family-self"],
        rowScaleFactor: 1,
      }),
    ).toBe(100);
  });

  it("splits shared rows by portion multipliers", () => {
    expect(
      getInstructionIngredientBadgeAmount({
        amount: 300,
        selectedFamilyMemberId: "family-self",
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds,
        appliesToEveryone: true,
        targetFamilyMemberIds: [],
        rowScaleFactor: 1,
      }),
    ).toBe(100);
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
});
