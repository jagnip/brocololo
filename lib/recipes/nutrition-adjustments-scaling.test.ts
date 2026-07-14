import { describe, expect, it } from "vitest";
import {
  calculateNutritionPerServing,
  getInstructionIngredientBadgeAmount,
  scaleNutrition,
  type RecipeForNutritionCalculation,
} from "@/lib/recipes/helpers";
import {
  resolveConsumableIngredientLine,
} from "@/lib/recipes/ingredient-adjustments";
import {
  createMockIngredient,
  createMockIngredientUnit,
  createMockRecipe,
  createMockRecipeIngredient,
  createMockUnit,
} from "@/lib/tests/test-helpers";
import type { FamilyMemberRow } from "@/lib/db/family-members";

const familyMembers: FamilyMemberRow[] = [
  { id: "fm-jagoda", name: "Jagoda", isSelf: true, sortOrder: 0, portionMultiplier: 1 },
  { id: "fm-nelson", name: "Nelson", isSelf: false, sortOrder: 1, portionMultiplier: 2 },
];

const nutritionFamilyMembers = familyMembers;

function nutritionFor(
  recipe: RecipeForNutritionCalculation,
  familyMemberId: string,
  ingredientCatalog?: Parameters<typeof calculateNutritionPerServing>[3],
) {
  return calculateNutritionPerServing(
    recipe,
    familyMemberId,
    nutritionFamilyMembers,
    ingredientCatalog,
  );
}

/** Mirrors recipe-page nutrition when global / per-row scale is applied. */
function scaleRecipeForNutrition(
  recipe: RecipeForNutritionCalculation,
  scaleFactor: number,
): RecipeForNutritionCalculation {
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((row) => ({
      ...row,
      amount: row.amount == null ? null : row.amount * scaleFactor,
      memberAdjustments: row.memberAdjustments.map((adjustment) =>
        adjustment.kind === "MODIFY" && adjustment.amount != null
          ? { ...adjustment, amount: adjustment.amount * scaleFactor }
          : adjustment,
      ),
    })),
  };
}

function createTunaAdjustmentRecipe() {
  const gramsUnit = createMockUnit({ id: "unit-g", name: "g" });
  const tunaInOil = createMockIngredient({
    id: "ing-tuna-oil",
    name: "Tuna in oil",
    calories: 190,
    proteins: 26,
    fats: 8,
    carbs: 0,
    unitConversions: [createMockIngredientUnit("ing-tuna-oil", "unit-g", 1)],
  });
  const tunaInBrine = createMockIngredient({
    id: "ing-tuna-brine",
    name: "Tuna in brine",
    calories: 110,
    proteins: 24,
    fats: 1,
    carbs: 0,
    unitConversions: [createMockIngredientUnit("ing-tuna-brine", "unit-g", 1)],
  });

  const row = createMockRecipeIngredient({
    id: "ri-tuna",
    amount: 85,
    ingredient: tunaInOil,
    unit: gramsUnit,
    memberAdjustments: [
      {
        familyMemberId: "fm-jagoda",
        kind: "MODIFY",
        ingredientId: "ing-tuna-brine",
        amount: 42.5,
        unitId: "unit-g",
        additionalInfo: null,
      },
      {
        familyMemberId: "fm-nelson",
        kind: "MODIFY",
        ingredientId: "ing-tuna-oil",
        amount: 85,
        unitId: "unit-g",
        additionalInfo: null,
      },
    ],
  });

  const recipe = createMockRecipe({
    servings: 2,
    audienceMembers: [
      { familyMemberId: "fm-jagoda" },
      { familyMemberId: "fm-nelson" },
    ],
    memberPortions: [
      { recipeId: "recipe-1", familyMemberId: "fm-nelson", multiplier: 2 },
    ],
    ingredients: [row],
  });

  return { recipe, tunaInOil, tunaInBrine, gramsUnit };
}

describe("nutrition with member adjustments", () => {
  it("uses MODIFY substitute macros instead of the base ingredient", () => {
    const { recipe, tunaInOil, tunaInBrine } = createTunaAdjustmentRecipe();
    const catalog = [tunaInOil, tunaInBrine];

    const jagoda = nutritionFor(recipe, "fm-jagoda", catalog);
    const nelson = nutritionFor(recipe, "fm-nelson", catalog);

    // Jagoda: 42.5g brine @ 110 kcal/100g = 46.75 kcal
    expect(jagoda.calories).toBe(47);
    expect(jagoda.protein).toBe(10.2);

    // Nelson: 85g oil @ 190 kcal/100g = 161.5 kcal
    expect(nelson.calories).toBe(162);
    expect(nelson.protein).toBe(22.1);
  });

  it("excludes SKIP adjustments from member nutrition", () => {
    const gramsUnit = createMockUnit({ id: "unit-g", name: "g" });
    const butter = createMockIngredient({
      id: "ing-butter",
      calories: 717,
      proteins: 0.9,
      fats: 81,
      carbs: 0.1,
      unitConversions: [createMockIngredientUnit("ing-butter", "unit-g", 1)],
    });
    const pasta = createMockIngredient({
      id: "ing-pasta",
      calories: 350,
      proteins: 12,
      fats: 2,
      carbs: 70,
      unitConversions: [createMockIngredientUnit("ing-pasta", "unit-g", 1)],
    });

    const recipe = createMockRecipe({
      servings: 2,
      audienceMembers: [
        { familyMemberId: "fm-jagoda" },
        { familyMemberId: "fm-nelson" },
      ],
      memberPortions: [],
      ingredients: [
        createMockRecipeIngredient({
          id: "ri-butter",
          amount: 40,
          ingredient: butter,
          unit: gramsUnit,
          memberAdjustments: [
            { familyMemberId: "fm-nelson", kind: "SKIP" },
          ],
        }),
        createMockRecipeIngredient({
          id: "ri-pasta",
          amount: 200,
          ingredient: pasta,
          unit: gramsUnit,
        }),
      ],
    });

    const jagoda = nutritionFor(recipe, "fm-jagoda");
    const nelson = nutritionFor(recipe, "fm-nelson");

    // Nelson skips butter; pasta share (200g batch ÷ 2 servings × 2×) = 200g.
    expect(nelson.calories).toBe(700);
    expect(nelson.fat).toBe(4);
    expect(jagoda.calories).toBeLessThan(nelson.calories);
  });

  it("applies portion multipliers on default lines without explicit MODIFY", () => {
    const gramsUnit = createMockUnit({ id: "unit-g", name: "g" });
    const rice = createMockIngredient({
      id: "ing-rice",
      calories: 130,
      proteins: 2.7,
      fats: 0.3,
      carbs: 28,
      unitConversions: [createMockIngredientUnit("ing-rice", "unit-g", 1)],
    });

    const recipe = createMockRecipe({
      servings: 2,
      audienceMembers: [
        { familyMemberId: "fm-jagoda" },
        { familyMemberId: "fm-nelson" },
      ],
      memberPortions: [
        { recipeId: "recipe-1", familyMemberId: "fm-nelson", multiplier: 2 },
      ],
      ingredients: [
        createMockRecipeIngredient({
          id: "ri-rice",
          amount: 300,
          ingredient: rice,
          unit: gramsUnit,
        }),
      ],
    });

    const jagoda = nutritionFor(recipe, "fm-jagoda");
    const nelson = nutritionFor(recipe, "fm-nelson");

    // 300g batch, 2 servings, Nelson 2× household multiplier => Jagoda 150g, Nelson 300g.
    expect(jagoda.calories).toBe(195);
    expect(nelson.calories).toBe(390);
  });
});

describe("nutrition scaling with member adjustments", () => {
  it("doubles per-person nutrition when recipe rows and MODIFY amounts are scaled", () => {
    const { recipe, tunaInOil, tunaInBrine } = createTunaAdjustmentRecipe();
    const catalog = [tunaInOil, tunaInBrine];

    const baseJagoda = nutritionFor(recipe, "fm-jagoda", catalog);
    const baseNelson = nutritionFor(recipe, "fm-nelson", catalog);

    const scaled = scaleRecipeForNutrition(recipe, 2);
    const scaledJagoda = nutritionFor(scaled, "fm-jagoda", catalog);
    const scaledNelson = nutritionFor(scaled, "fm-nelson", catalog);

    expect(scaledJagoda.calories / baseJagoda.calories).toBeCloseTo(2, 1);
    expect(scaledNelson.calories / baseNelson.calories).toBeCloseTo(2, 1);
    expect(scaledJagoda.protein).toBeCloseTo(baseJagoda.protein * 2, 1);
    expect(scaledNelson.protein).toBeCloseTo(baseNelson.protein * 2, 1);
  });

  it("matches scaleNutrition when default lines are scaled uniformly", () => {
    const gramsUnit = createMockUnit({ id: "unit-g", name: "g" });
    const chicken = createMockIngredient({
      id: "ing-chicken",
      calories: 165,
      proteins: 31,
      fats: 3.6,
      carbs: 0,
      unitConversions: [createMockIngredientUnit("ing-chicken", "unit-g", 1)],
    });

    const recipe = createMockRecipe({
      servings: 4,
      audienceMembers: [
        { familyMemberId: "fm-jagoda" },
        { familyMemberId: "fm-nelson" },
      ],
      memberPortions: [
        { recipeId: "recipe-1", familyMemberId: "fm-nelson", multiplier: 1.5 },
      ],
      ingredients: [
        createMockRecipeIngredient({
          id: "ri-chicken",
          amount: 400,
          ingredient: chicken,
          unit: gramsUnit,
        }),
      ],
    });

    const base = nutritionFor(recipe, "fm-jagoda");
    const scaledRecipe = scaleRecipeForNutrition(recipe, 1.2);
    const scaledDirect = nutritionFor(scaledRecipe, "fm-jagoda");
    const scaledViaHelper = scaleNutrition(base, 1.2);

    expect(scaledDirect.calories).toBe(scaledViaHelper.calories);
    expect(scaledDirect.protein).toBe(scaledViaHelper.protein);
  });

  it("scales MODIFY consumable lines via batchScaleFactor", () => {
    const line = resolveConsumableIngredientLine({
      row: {
        id: "ri-tuna",
        ingredientId: "ing-tuna-oil",
        amount: 85,
        unitId: "unit-g",
        additionalInfo: null,
        memberAdjustments: [
          {
            familyMemberId: "fm-nelson",
            kind: "MODIFY",
            ingredientId: "ing-tuna-oil",
            amount: 85,
            unitId: "unit-g",
          },
        ],
      },
      familyMemberId: "fm-nelson",
      recipeServings: 2,
      familyMembers,
      memberPortions: [
        { familyMemberId: "fm-nelson", multiplier: 2 },
      ],
      recipeAudienceFamilyMemberIds: ["fm-jagoda", "fm-nelson"],
      batchScaleFactor: 1.5,
    });

    expect(line).toEqual({
      ingredientId: "ing-tuna-oil",
      unitId: "unit-g",
      amount: 127.5,
    });
  });

  it("scales MODIFY badge amounts the same way as consumable resolution", () => {
    const badgeAmount = getInstructionIngredientBadgeAmount({
      amount: 85,
      memberAdjustments: [
        {
          familyMemberId: "fm-nelson",
          kind: "MODIFY",
          ingredientId: "ing-tuna-oil",
          amount: 85,
          unitId: "unit-g",
        },
      ],
      audienceMemberIds: ["fm-jagoda", "fm-nelson"],
      selectedFamilyMemberId: "fm-nelson",
      familyMembers,
      memberPortions: [{ familyMemberId: "fm-nelson", multiplier: 2 }],
      cookingFamilyMemberIds: ["fm-jagoda", "fm-nelson"],
      rowScaleFactor: 1.5,
    });

    const consumable = resolveConsumableIngredientLine({
      row: {
        id: "ri-tuna",
        ingredientId: "ing-tuna-oil",
        amount: 85,
        unitId: "unit-g",
        additionalInfo: null,
        memberAdjustments: [
          {
            familyMemberId: "fm-nelson",
            kind: "MODIFY",
            ingredientId: "ing-tuna-oil",
            amount: 85,
            unitId: "unit-g",
          },
        ],
      },
      familyMemberId: "fm-nelson",
      recipeServings: 2,
      familyMembers,
      memberPortions: [{ familyMemberId: "fm-nelson", multiplier: 2 }],
      recipeAudienceFamilyMemberIds: ["fm-jagoda", "fm-nelson"],
      batchScaleFactor: 1.5,
    });

    expect(badgeAmount).toBe(127.5);
    expect(consumable?.amount).toBe(badgeAmount);
  });
});
