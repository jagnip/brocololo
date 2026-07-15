import { describe, expect, it } from "vitest";
import { transformPlanToShoppingListRows, type PlanSlotData } from "@/lib/groceries/helpers";

const familyMembers = [
  { id: "fm-jagoda", isSelf: true },
  { id: "fm-nelson", isSelf: false },
];

function buildGrocerySlot(
  overrides?: Partial<PlanSlotData>,
): PlanSlotData {
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
            {
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
            },
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
});
