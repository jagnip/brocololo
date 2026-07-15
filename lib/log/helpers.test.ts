import { describe, expect, it } from "vitest";
import {
  getFamilyMemberIngredientAmountForScaledBatch,
  getFamilyMemberIngredientAmountPerMeal,
  getPersonIngredientAmountPerMeal,
} from "@/lib/log/helpers";

describe("getPersonIngredientAmountPerMeal", () => {
  it("uses independent per-meal shares with legacy Nelson multiplier", () => {
    const primary = getPersonIngredientAmountPerMeal({
      amount: 300,
      nutritionTarget: "BOTH",
      person: "primary",
      recipeServings: 4,
      servingMultiplierForNelson: 1.5,
    });
    const secondary = getPersonIngredientAmountPerMeal({
      amount: 300,
      nutritionTarget: "BOTH",
      person: "secondary",
      recipeServings: 4,
      servingMultiplierForNelson: 1.5,
    });

    expect(primary).toBeCloseTo(75);
    expect(secondary).toBeCloseTo(112.5);
  });

  it("returns null for invalid servings", () => {
    const value = getPersonIngredientAmountPerMeal({
      amount: 100,
      nutritionTarget: "BOTH",
      person: "primary",
      recipeServings: 0,
      servingMultiplierForNelson: 1,
    });

    expect(value).toBeNull();
  });
});

describe("getFamilyMemberIngredientAmountPerMeal", () => {
  const familyMembers = [
    { id: "self", isSelf: true },
    { id: "partner", isSelf: false },
    { id: "child", isSelf: false },
  ];
  const memberPortions = [
    { familyMemberId: "partner", multiplier: 1.5 },
    { familyMemberId: "child", multiplier: 1 },
  ];

  it("uses batch ÷ servings × portion multiplier for each person", () => {
    const amounts = ["self", "partner", "child"].map((familyMemberId) =>
      getFamilyMemberIngredientAmountPerMeal({
        amount: 350,
        appliesToEveryone: true,
        targetFamilyMemberIds: [],
        familyMemberId,
        recipeServings: 3,
        familyMembers,
        memberPortions,
      }),
    );

    expect(amounts[0]).toBeCloseTo(350 / 3);
    expect(amounts[1]).toBeCloseTo((350 / 3) * 1.5);
    expect(amounts[2]).toBeCloseTo(350 / 3);
  });

  it("halves per-meal amounts when servings double", () => {
    const selfAmount = getFamilyMemberIngredientAmountPerMeal({
      amount: 350,
      appliesToEveryone: true,
      targetFamilyMemberIds: [],
      familyMemberId: "self",
      recipeServings: 6,
      familyMembers,
      memberPortions,
    });

    expect(selfAmount).toBeCloseTo(350 / 6);
  });

  it("returns amount for any household member when ingredient applies to everyone", () => {
    const amount = getFamilyMemberIngredientAmountPerMeal({
      amount: 100,
      appliesToEveryone: true,
      targetFamilyMemberIds: [],
      familyMemberId: "child",
      recipeServings: 2,
      familyMembers,
      memberPortions,
    });

    expect(amount).toBeCloseTo(50);
  });

  it("applies portion multiplier for the account holder", () => {
    const selfAmount = getFamilyMemberIngredientAmountPerMeal({
      amount: 300,
      appliesToEveryone: true,
      targetFamilyMemberIds: [],
      familyMemberId: "self",
      recipeServings: 2,
      familyMembers: [
        { id: "self", isSelf: true },
        { id: "partner", isSelf: false },
      ],
      memberPortions: [
        { familyMemberId: "self", multiplier: 2 },
        { familyMemberId: "partner", multiplier: 1 },
      ],
    });

    expect(selfAmount).toBeCloseTo(300);
  });

  it("returns null for members outside targeted ingredients", () => {
    const amount = getFamilyMemberIngredientAmountPerMeal({
      amount: 50,
      appliesToEveryone: false,
      targetFamilyMemberIds: ["child"],
      familyMemberId: "self",
      recipeServings: 1,
      familyMembers: [
        { id: "self", isSelf: true },
        { id: "child", isSelf: false },
      ],
      memberPortions: [],
    });

    expect(amount).toBeNull();
  });
});

describe("getFamilyMemberIngredientAmountForScaledBatch", () => {
  it("uses independent per-meal formula on a display-scaled batch", () => {
    const familyMembers = [
      { id: "self", isSelf: true },
      { id: "partner", isSelf: false },
    ];
    const memberPortions = [{ familyMemberId: "partner", multiplier: 2 }];

    expect(
      getFamilyMemberIngredientAmountForScaledBatch({
        amount: 900,
        appliesToEveryone: true,
        targetFamilyMemberIds: [],
        familyMemberId: "self",
        recipeServings: 2,
        familyMembers,
        memberPortions,
      }),
    ).toBe(450);
    expect(
      getFamilyMemberIngredientAmountForScaledBatch({
        amount: 900,
        appliesToEveryone: true,
        targetFamilyMemberIds: [],
        familyMemberId: "partner",
        recipeServings: 2,
        familyMembers,
        memberPortions,
      }),
    ).toBe(900);
  });
});
