import { describe, expect, it } from "vitest";
import {
  formatAmount,
  transformPlanToShoppingListRows,
  type PlanSlotData,
} from "../groceries/helpers";

function slotFromRecipe(
  recipe: NonNullable<PlanSlotData["recipe"]> | null,
): PlanSlotData {
  return { recipe };
}

function baseRecipe(overrides?: Partial<NonNullable<PlanSlotData["recipe"]>>) {
  return {
    name: "Recipe A",
    servings: 2,
    servingMultiplierForNelson: 1,
    ingredients: [
      {
        ingredient: {
          id: "ing-1",
          name: "Chicken thighs",
          icon: null,
          supermarketUrl: null,
          unitConversions: [{ unitId: "unit-g", gramsPerUnit: 1 }],
          category: { id: "cat-meat", name: "Meat", sortOrder: 2 },
        },
        unit: { id: "unit-g", name: "g" },
        amount: 400,
      },
    ],
    ...overrides,
  } satisfies NonNullable<PlanSlotData["recipe"]>;
}

describe("transformPlanToShoppingListRows", () => {
  it("returns empty for empty slots or null recipes", () => {
    expect(transformPlanToShoppingListRows([])).toEqual([]);
    expect(transformPlanToShoppingListRows([slotFromRecipe(null)])).toEqual([]);
  });

  it("returns persisted-row shape with FK fields", () => {
    const rows = transformPlanToShoppingListRows([slotFromRecipe(baseRecipe())]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      ingredientName: "Chicken thighs",
      amount: 400,
      unitName: "g",
      ingredientId: "ing-1",
      ingredientCategoryId: "cat-meat",
      unitId: "unit-g",
      recipeNames: ["Recipe A"],
    });
  });

  it("aggregates same ingredient and unit across recipes", () => {
    const slots: PlanSlotData[] = [
      slotFromRecipe(baseRecipe({ name: "Recipe A" })),
      slotFromRecipe(
        baseRecipe({
          name: "Recipe B",
          ingredients: [
            {
              ingredient: {
                id: "ing-1",
                name: "Chicken thighs",
                icon: null,
                supermarketUrl: null,
                unitConversions: [{ unitId: "unit-g", gramsPerUnit: 1 }],
                category: { id: "cat-meat", name: "Meat", sortOrder: 2 },
              },
              unit: { id: "unit-g", name: "g" },
              amount: 200,
            },
          ],
        }),
      ),
    ];

    const rows = transformPlanToShoppingListRows(slots);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.amount).toBe(600);
    expect(rows[0]?.recipeNames).toEqual(["Recipe A", "Recipe B"]);
  });

  it("falls back to grams when units differ and conversions exist", () => {
    const slots: PlanSlotData[] = [
      slotFromRecipe(
        baseRecipe({
          name: "Cup recipe",
          ingredients: [
            {
              ingredient: {
                id: "ing-2",
                name: "Ricotta",
                icon: null,
                supermarketUrl: null,
                unitConversions: [
                  { unitId: "unit-cup", gramsPerUnit: 250 },
                  { unitId: "unit-g", gramsPerUnit: 1 },
                ],
                category: { id: "cat-dairy", name: "Dairy", sortOrder: 1 },
              },
              unit: { id: "unit-cup", name: "cup" },
              amount: 1,
            },
          ],
        }),
      ),
      slotFromRecipe(
        baseRecipe({
          name: "Gram recipe",
          ingredients: [
            {
              ingredient: {
                id: "ing-2",
                name: "Ricotta",
                icon: null,
                supermarketUrl: null,
                unitConversions: [
                  { unitId: "unit-cup", gramsPerUnit: 250 },
                  { unitId: "unit-g", gramsPerUnit: 1 },
                ],
                category: { id: "cat-dairy", name: "Dairy", sortOrder: 1 },
              },
              unit: { id: "unit-g", name: "g" },
              amount: 100,
            },
          ],
        }),
      ),
    ];

    const rows = transformPlanToShoppingListRows(slots);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.amount).toBe(350);
    expect(rows[0]?.unitName).toBe("g");
    expect(rows[0]?.unitId).toBeNull();
  });
});

describe("formatAmount", () => {
  it("formats integers and trims trailing decimals", () => {
    expect(formatAmount(200)).toBe("200");
    expect(formatAmount(2.5)).toBe("2.5");
    expect(formatAmount(2.0)).toBe("2");
  });
});
