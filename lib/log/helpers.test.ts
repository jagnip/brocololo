import { describe, expect, it } from "vitest";
import {
  getFamilyMemberIngredientAmountForScaledBatch,
  getFamilyMemberIngredientAmountPerMeal,
  getPersonIngredientAmountPerMeal,
} from "@/lib/log/helpers";

describe("getPersonIngredientAmountPerMeal", () => {
  it("splits BOTH ingredients by serving multiplier", () => {
    // 300 total ingredient amount over 2 meals => 150 per meal baseline.
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

    // Split ratio is 1:1.5 => primary 60, secondary 90 for each meal.
    expect(primary).toBeCloseTo(60);
    expect(secondary).toBeCloseTo(90);
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
  const cookingFamilyMemberIds = ["self", "partner", "child"];

  it("uses plate-count servings for a one-meal three-person recipe", () => {
    const amounts = cookingFamilyMemberIds.map((familyMemberId) =>
      getFamilyMemberIngredientAmountPerMeal({
        amount: 350,
        appliesToEveryone: true,
        targetFamilyMemberIds: [],
        familyMemberId,
        recipeServings: 3,
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds,
      }),
    );

    // One meal consumes the whole 350g row; multipliers split it 1:1.5:1.
    expect(amounts[0]).toBeCloseTo(100);
    expect(amounts[1]).toBeCloseTo(150);
    expect(amounts[2]).toBeCloseTo(100);
  });

  it("halves one-meal amounts for a two-meal three-person batch", () => {
    const selfAmount = getFamilyMemberIngredientAmountPerMeal({
      amount: 350,
      appliesToEveryone: true,
      targetFamilyMemberIds: [],
      familyMemberId: "self",
      recipeServings: 6,
      familyMembers,
      memberPortions,
      cookingFamilyMemberIds,
    });

    expect(selfAmount).toBeCloseTo(50);
  });

  it("blocks members outside the cooking audience", () => {
    const amount = getFamilyMemberIngredientAmountPerMeal({
      amount: 100,
      appliesToEveryone: true,
      targetFamilyMemberIds: [],
      familyMemberId: "child",
      recipeServings: 2,
      familyMembers,
      memberPortions,
      cookingFamilyMemberIds: ["self", "partner"],
    });

    expect(amount).toBeNull();
  });

  it("allows the account holder to have a custom multiplier", () => {
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
      cookingFamilyMemberIds: ["self", "partner"],
    });

    expect(selfAmount).toBeCloseTo(200);
  });

  it("gives off-recipe diners one shared portion of applies-to-everyone ingredients", () => {
  // Recipe is for child only; adult joins the meal off-recipe.
    const familyMembers = [
      { id: "self", isSelf: true },
      { id: "child", isSelf: false },
    ];
    const amount = getFamilyMemberIngredientAmountPerMeal({
      amount: 200,
      appliesToEveryone: true,
      targetFamilyMemberIds: [],
      familyMemberId: "self",
      recipeServings: 1,
      familyMembers,
      memberPortions: [],
      cookingFamilyMemberIds: ["self", "child"],
      recipeAudienceFamilyMemberIds: ["child"],
    });

    // Shared row split: adult weight 1 + child weight 1 => 100 each for one meal.
    expect(amount).toBeCloseTo(100);
  });

  it("returns null for off-recipe diners on targeted ingredients", () => {
    const familyMembers = [
      { id: "self", isSelf: true },
      { id: "child", isSelf: false },
    ];
    const amount = getFamilyMemberIngredientAmountPerMeal({
      amount: 50,
      appliesToEveryone: false,
      targetFamilyMemberIds: ["child"],
      familyMemberId: "self",
      recipeServings: 1,
      familyMembers,
      memberPortions: [],
      cookingFamilyMemberIds: ["self", "child"],
      recipeAudienceFamilyMemberIds: ["child"],
    });

    expect(amount).toBeNull();
  });
});

describe("getFamilyMemberIngredientAmountForScaledBatch", () => {
  it("splits the full scaled row without dividing by servings again", () => {
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
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds: ["self", "partner"],
      }),
    ).toBe(300);
    expect(
      getFamilyMemberIngredientAmountForScaledBatch({
        amount: 900,
        appliesToEveryone: true,
        targetFamilyMemberIds: [],
        familyMemberId: "partner",
        familyMembers,
        memberPortions,
        cookingFamilyMemberIds: ["self", "partner"],
      }),
    ).toBe(600);
  });
});
