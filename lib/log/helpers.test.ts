import { describe, expect, it } from "vitest";
import {
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
});
