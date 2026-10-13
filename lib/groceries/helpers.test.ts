import { describe, expect, it } from "vitest";
import { transformPlanToShoppingListRows, type PlanSlotData } from "@/lib/groceries/helpers";
import type { MemberAdjustmentRow } from "@/lib/recipes/resolve-ingredient-lines";

const familyMembers = [
  { id: "fm-jagoda", isSelf: true },
  { id: "fm-nelson", isSelf: false },
];

function buildGrocerySlot(
  overrides?: Partial<PlanSlotData>,
): PlanSlotData {
  const modifyAdjustment: MemberAdjustmentRow & {
    ingredient: NonNullable<PlanSlotData["recipe"]>["ingredients"][number]["ingredient"];
    unit: NonNullable<PlanSlotData["recipe"]>["ingredients"][number]["unit"];
  } = {
    familyMemberId: "fm-jagoda",
    kind: "MODIFY",
    ingredientId: "ing-olive-oil",
    amount: 10,
    unitId: "unit-g",
    ingredient: {
      id: "ing-olive-oil",
      name: "Olive oil",
      brand: null,
      descriptor: null,
      icon: null,
      supermarketUrl: null,
      unitConversions: [{ unitId: "unit-g", gramsPerUnit: 1 }],
      category: { id: "cat-1", name: "Oil", sortOrder: 0 },
    },
    unit: { id: "unit-g", name: "g" },
  };

  return {
    recipeId: "recipe-1",
    cookingFamilyMemberIds: ["fm-jagoda", "fm-nelson"],
    familyMembers,
    recipe: {
      name: "Test Recipe",
      servings: 2,
      audienceMembers: [
        { familyMemberId: "fm-jagoda" },
        { familyMemberId: "fm-nelson" },
      ],
      memberPortions: [],
      ingredients: [
        {
          id: "ri-butter",
          ingredientId: "ing-butter",
          amount: 40,
          additionalInfo: null,
          memberAdjustments: [
            modifyAdjustment,
            { familyMemberId: "fm-nelson", kind: "SKIP" },
          ],
          ingredient: {
            id: "ing-butter",
            name: "Butter",
            brand: null,
            descriptor: null,
            icon: null,
            supermarketUrl: null,
            unitConversions: [{ unitId: "unit-g", gramsPerUnit: 1 }],
            category: { id: "cat-2", name: "Dairy", sortOrder: 1 },
          },
          unit: { id: "unit-g", name: "g" },
        },
      ],
    },
    customName: null,
    customIngredients: [],
    ...overrides,
  };
}

describe("transformPlanToShoppingListRows with member adjustments", () => {
  it("uses MODIFY substitute for adjusted eater and default for others", () => {
    const rows = transformPlanToShoppingListRows([buildGrocerySlot()]);

    const oliveOil = rows.find((row) => row.ingredientName.includes("Olive oil"));
    const butter = rows.find((row) => row.ingredientName.includes("Butter"));

    expect(oliveOil?.amount).toBe(10);
    expect(butter).toBeUndefined();
  });

  it("omits skipped ingredient amounts for skipped eater only", () => {
    const rows = transformPlanToShoppingListRows([
      buildGrocerySlot({
        cookingFamilyMemberIds: ["fm-nelson"],
      }),
    ]);

    expect(rows.find((row) => row.ingredientName.includes("Olive oil"))).toBeUndefined();
    expect(rows).toHaveLength(0);
  });

  it("aggregates scheduled meal audiences", () => {
    const rows = transformPlanToShoppingListRows([
      buildGrocerySlot({ cookingFamilyMemberIds: ["fm-jagoda"] }),
      buildGrocerySlot({ cookingFamilyMemberIds: ["fm-jagoda"] }),
      buildGrocerySlot({ cookingFamilyMemberIds: ["fm-nelson"] }),
    ]);

    // Jagoda's MODIFY contributes 10 g twice. Nelson skips.
    expect(rows.find((row) => row.ingredientName === "Olive oil")?.amount).toBe(20);
    expect(rows.find((row) => row.ingredientName === "Butter")).toBeUndefined();
  });

  it("excludes scheduled quantities by recipe id", () => {
    const rows = transformPlanToShoppingListRows(
      [
        buildGrocerySlot(),
        buildGrocerySlot({ cookingFamilyMemberIds: ["fm-jagoda"] }),
      ],
      { excludedRecipeIds: ["recipe-1"], excludedCustomMealNames: [] },
    );
    expect(rows).toEqual([]);
  });

  it.each([
    { isRolledOver: true },
    { alreadyCooked: true },
    { isRolledOver: true, alreadyCooked: true },
  ])("excludes recipe and custom meals before scaling with %j", (flags) => {
    const slot = buildGrocerySlot();
    const rows = transformPlanToShoppingListRows([
      buildGrocerySlot(),
      buildGrocerySlot(flags),
      buildGrocerySlot({
        ...flags,
        recipe: null,
        customName: "Custom meal",
        customIngredients: [{
          ingredient: slot.recipe!.ingredients[0].ingredient,
          unit: { id: "unit-g", name: "g" },
          amount: 100,
        }],
      }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ ingredientName: "Olive oil", amount: 10 });
  });

  it("scales explicitly selected available quantities without including unchecked fresh meals", () => {
    const rows = transformPlanToShoppingListRows([
      buildGrocerySlot(),
      buildGrocerySlot({ isRolledOver: true }),
      buildGrocerySlot({ alreadyCooked: true }),
    ], {
      excludedRecipeIds: ["recipe-1"],
      excludedCustomMealNames: [],
      includedAvailableRecipeIds: ["recipe-1"],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ ingredientName: "Olive oil", amount: 20 });
  });
});
