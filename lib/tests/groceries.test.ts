import { describe, it, expect } from "vitest";
import {
  transformPlanToGroceryItems,
  formatAmount,
  type PlanSlotData,
} from "../groceries/helpers";

// ============================================================================
// HELPERS
// ============================================================================

function createSlot(
  overrides?: Partial<NonNullable<PlanSlotData["recipe"]>> & { hasRecipe?: boolean },
): PlanSlotData {
  if (overrides?.hasRecipe === false) {
    return { recipe: null };
  }

  return {
    recipe: {
      name: "Test Recipe",
      servings: 4,
      servingMultiplierForNelson: 1.5,
      ingredients: [
        {
          ingredient: {
            id: "ing-chicken",
            name: "Chicken Breast",
            icon: "chicken-breast.svg",
            unitConversions: [{ unitId: "unit-grams", gramsPerUnit: 1 }],
            category: { name: "Meat & Poultry", sortOrder: 3 },
          },
          unit: { id: "unit-grams", name: "grams" },
          amount: 400,
        },
      ],
      ...overrides,
    },
  };
}

// ============================================================================
// transformPlanToGroceryItems
// ============================================================================

describe("transformPlanToGroceryItems", () => {
  it("returns an empty array for an empty plan", () => {
    expect(transformPlanToGroceryItems([])).toEqual([]);
  });

  it("skips slots with no recipe assigned", () => {
    const slots = [createSlot({ hasRecipe: false })];
    expect(transformPlanToGroceryItems(slots)).toEqual([]);
  });

  it("returns scaled ingredients for a single slot", () => {
    // Recipe: 4 servings, 400g chicken
    // scalingFactor = 2 / 4 = 0.5
    // scaled amount = 400 * 0.5 = 200
    const slots = [createSlot()];
    const result = transformPlanToGroceryItems(slots);

    expect(result).toEqual([
      {
        ingredientName: "Chicken Breast",
        ingredientIcon: "chicken-breast.svg",
        amount: 200,
        unitName: "grams",
        recipeNames: ["Test Recipe"],
        categoryName: "Meat & Poultry",
        categorySortOrder: 3,
      },
    ]);
  });

  it("skips null-recipe slots while processing slots with recipes", () => {
    const slots = [
      createSlot({ hasRecipe: false }),
      createSlot({ name: "Pasta" }),
      createSlot({ hasRecipe: false }),
    ];

    const result = transformPlanToGroceryItems(slots);

    expect(result).toHaveLength(1);
    expect(result[0].recipeNames).toEqual(["Pasta"]);
  });

  // ── Aggregation: same unit ─────────────────────────────────────────────

  it("aggregates same ingredient + same unit across recipes", () => {
    const slots = [
      createSlot({
        name: "Recipe A",
        servings: 2,
        servingMultiplierForNelson: 1,
        ingredients: [
          {
            ingredient: {
              id: "ing-chicken",
              name: "Chicken",
              icon: "chicken.svg",
              unitConversions: [{ unitId: "unit-grams", gramsPerUnit: 1 }],
              category: { name: "Meat & Poultry", sortOrder: 3 },
            },
            unit: { id: "unit-grams", name: "grams" },
            amount: 400,
          },
        ],
      }),
      createSlot({
        name: "Recipe B",
        servings: 2,
        servingMultiplierForNelson: 1,
        ingredients: [
          {
            ingredient: {
              id: "ing-chicken",
              name: "Chicken",
              icon: "chicken.svg",
              unitConversions: [{ unitId: "unit-grams", gramsPerUnit: 1 }],
              category: { name: "Meat & Poultry", sortOrder: 3 },
            },
            unit: { id: "unit-grams", name: "grams" },
            amount: 200,
          },
        ],
      }),
    ];

    const result = transformPlanToGroceryItems(slots);

    // scalingFactor = (1 + 1) / 2 = 1 for both
    // 400 + 200 = 600
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(600);
    expect(result[0].unitName).toBe("grams");
    expect(result[0].recipeNames).toEqual(["Recipe A", "Recipe B"]);
  });

  it("deduplicates recipe names when same recipe contributes twice", () => {
    const slots = [
      createSlot({
        name: "Pasta",
        servings: 2,
        servingMultiplierForNelson: 1,
        ingredients: [
          {
            ingredient: {
              id: "ing-tomato",
              name: "Tomato",
              icon: "tomato.svg",
              unitConversions: [],
              category: { name: "Produce", sortOrder: 1 },
            },
            unit: { id: "unit-pieces", name: "pieces" },
            amount: 2,
          },
        ],
      }),
      createSlot({
        name: "Pasta",
        servings: 2,
        servingMultiplierForNelson: 1,
        ingredients: [
          {
            ingredient: {
              id: "ing-tomato",
              name: "Tomato",
              icon: "tomato.svg",
              unitConversions: [],
              category: { name: "Produce", sortOrder: 1 },
            },
            unit: { id: "unit-pieces", name: "pieces" },
            amount: 3,
          },
        ],
      }),
    ];

    const result = transformPlanToGroceryItems(slots);

    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(5);
    expect(result[0].recipeNames).toEqual(["Pasta"]);
  });

  // ── Aggregation: different units → grams conversion ────────────────────

  it("converts to grams when same ingredient has different units", () => {
    const slots = [
      createSlot({
        name: "Recipe A",
        servings: 2,
        servingMultiplierForNelson: 1,
        ingredients: [
          {
            ingredient: {
              id: "ing-tomato",
              name: "Tomato",
              icon: "tomato.svg",
              unitConversions: [
                { unitId: "unit-pieces", gramsPerUnit: 150 },
                { unitId: "unit-grams", gramsPerUnit: 1 },
              ],
              category: { name: "Produce", sortOrder: 1 },
            },
            unit: { id: "unit-pieces", name: "pieces" },
            amount: 2,
          },
        ],
      }),
      createSlot({
        name: "Recipe B",
        servings: 2,
        servingMultiplierForNelson: 1,
        ingredients: [
          {
            ingredient: {
              id: "ing-tomato",
              name: "Tomato",
              icon: "tomato.svg",
              unitConversions: [
                { unitId: "unit-pieces", gramsPerUnit: 150 },
                { unitId: "unit-grams", gramsPerUnit: 1 },
              ],
              category: { name: "Produce", sortOrder: 1 },
            },
            unit: { id: "unit-grams", name: "grams" },
            amount: 200,
          },
        ],
      }),
    ];

    const result = transformPlanToGroceryItems(slots);

    // scaling = (1+1)/2 = 1 for both
    // Recipe A: 2 pieces * 150 g/piece = 300g
    // Recipe B: 200g * 1 g/g = 200g
    // Total: 500g
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(500);
    expect(result[0].unitName).toBe("g");
    expect(result[0].recipeNames).toEqual(["Recipe A", "Recipe B"]);
  });

  it("keeps separate lines when grams conversion is missing for a unit", () => {
    const slots = [
      createSlot({
        name: "Recipe A",
        servings: 2,
        servingMultiplierForNelson: 1,
        ingredients: [
          {
            ingredient: {
              id: "ing-oil",
              name: "Olive Oil",
              icon: "oil.svg",
              unitConversions: [{ unitId: "unit-ml", gramsPerUnit: 0.92 }],
              category: { name: "Oils & Vinegars", sortOrder: 7 },
            },
            unit: { id: "unit-ml", name: "ml" },
            amount: 20,
          },
        ],
      }),
      createSlot({
        name: "Recipe B",
        servings: 2,
        servingMultiplierForNelson: 1,
        ingredients: [
          {
            ingredient: {
              id: "ing-oil",
              name: "Olive Oil",
              icon: "oil.svg",
              unitConversions: [{ unitId: "unit-ml", gramsPerUnit: 0.92 }],
              category: { name: "Oils & Vinegars", sortOrder: 7 },
            },
            unit: { id: "unit-tbsp", name: "tbsp" },
            amount: 2,
          },
        ],
      }),
    ];

    const result = transformPlanToGroceryItems(slots);

    // tbsp has no gramsPerUnit conversion → can't merge → two separate lines
    expect(result).toHaveLength(2);
    const mlLine = result.find((r) => r.unitName === "ml");
    const tbspLine = result.find((r) => r.unitName === "tbsp");
    expect(mlLine!.amount).toBe(20);
    expect(mlLine!.recipeNames).toEqual(["Recipe A"]);
    expect(tbspLine!.amount).toBe(2);
    expect(tbspLine!.recipeNames).toEqual(["Recipe B"]);
  });

  // ── Null amounts ───────────────────────────────────────────────────────

  it("preserves null amount for ingredients without a fixed quantity", () => {
    const slots = [
      createSlot({
        name: "Recipe A",
        ingredients: [
          {
            ingredient: { id: "ing-salt", name: "Salt", icon: null, unitConversions: [], category: { name: "Seasonings", sortOrder: 8 } },
            unit: { id: "unit-taste", name: "to taste" },
            amount: null,
          },
        ],
      }),
    ];

    const result = transformPlanToGroceryItems(slots);

    expect(result).toHaveLength(1);
    expect(result[0].amount).toBeNull();
    expect(result[0].unitName).toBe("to taste");
    expect(result[0].recipeNames).toEqual(["Recipe A"]);
  });

  it("deduplicates null-amount items for the same ingredient across recipes", () => {
    const slots = [
      createSlot({
        name: "Recipe A",
        ingredients: [
          {
            ingredient: { id: "ing-salt", name: "Salt", icon: null, unitConversions: [], category: { name: "Seasonings", sortOrder: 8 } },
            unit: { id: "unit-taste", name: "to taste" },
            amount: null,
          },
        ],
      }),
      createSlot({
        name: "Recipe B",
        ingredients: [
          {
            ingredient: { id: "ing-salt", name: "Salt", icon: null, unitConversions: [], category: { name: "Seasonings", sortOrder: 8 } },
            unit: { id: "unit-taste", name: "to taste" },
            amount: null,
          },
        ],
      }),
    ];

    const result = transformPlanToGroceryItems(slots);

    expect(result).toHaveLength(1);
    expect(result[0].amount).toBeNull();
    expect(result[0].recipeNames).toEqual(["Recipe A", "Recipe B"]);
  });

  it("emits null unit label when recipe ingredient has no unit", () => {
    const slots = [
      createSlot({
        name: "Recipe A",
        ingredients: [
          {
            ingredient: {
              id: "ing-salt",
              name: "Salt",
              icon: null,
              unitConversions: [],
              category: { name: "Seasonings", sortOrder: 8 },
            },
            unit: null,
            amount: null,
          },
        ],
      }),
    ];

    const result = transformPlanToGroceryItems(slots);

    expect(result).toHaveLength(1);
    expect(result[0].amount).toBeNull();
    expect(result[0].unitName).toBeNull();
  });

  // ── Different ingredients stay separate ────────────────────────────────

  it("keeps different ingredients as separate lines", () => {
    const slots = [
      createSlot({
        servings: 2,
        servingMultiplierForNelson: 1,
        ingredients: [
          {
            ingredient: {
              id: "ing-chicken",
              name: "Chicken",
              icon: "chicken.svg",
              unitConversions: [{ unitId: "unit-grams", gramsPerUnit: 1 }],
              category: { name: "Meat & Poultry", sortOrder: 3 },
            },
            unit: { id: "unit-grams", name: "grams" },
            amount: 400,
          },
          {
            ingredient: {
              id: "ing-rice",
              name: "Rice",
              icon: "rice.svg",
              unitConversions: [{ unitId: "unit-cups", gramsPerUnit: 185 }],
              category: { name: "Grains & Pasta", sortOrder: 5 },
            },
            unit: { id: "unit-cups", name: "cups" },
            amount: 2,
          },
        ],
      }),
    ];

    const result = transformPlanToGroceryItems(slots);

    expect(result).toHaveLength(2);
    const chicken = result.find((r) => r.ingredientName === "Chicken");
    const rice = result.find((r) => r.ingredientName === "Rice");
    expect(chicken!.amount).toBe(400);
    expect(rice!.amount).toBe(2);
  });

  // ── Sorting ────────────────────────────────────────────────────────────

  it("sorts results alphabetically by ingredient name", () => {
    const slots = [
      createSlot({
        servings: 2,
        servingMultiplierForNelson: 1,
        ingredients: [
          {
            ingredient: { id: "ing-z", name: "Zucchini", icon: "zucchini.svg", unitConversions: [], category: { name: "Produce", sortOrder: 1 } },
            unit: { id: "unit-pieces", name: "pieces" },
            amount: 1,
          },
          {
            ingredient: { id: "ing-a", name: "Avocado", icon: "avocado.svg", unitConversions: [], category: { name: "Produce", sortOrder: 1 } },
            unit: { id: "unit-pieces", name: "pieces" },
            amount: 2,
          },
          {
            ingredient: { id: "ing-m", name: "Mango", icon: null, unitConversions: [], category: { name: "Produce", sortOrder: 1 } },
            unit: { id: "unit-pieces", name: "pieces" },
            amount: 3,
          },
        ],
      }),
    ];

    const result = transformPlanToGroceryItems(slots);

    expect(result[0].ingredientName).toBe("Avocado");
    expect(result[1].ingredientName).toBe("Mango");
    expect(result[2].ingredientName).toBe("Zucchini");
  });

  // ── Scaling correctness ────────────────────────────────────────────────

  it("scales correctly for equal portions (multiplier = 1)", () => {
    // scalingFactor = 2 / 4 = 0.5
    const slots = [
      createSlot({
        servings: 4,
        servingMultiplierForNelson: 1,
        ingredients: [
          {
            ingredient: {
              id: "ing-rice",
              name: "Rice",
              icon: "rice.svg",
              unitConversions: [{ unitId: "unit-grams", gramsPerUnit: 1 }],
              category: { name: "Grains & Pasta", sortOrder: 5 },
            },
            unit: { id: "unit-grams", name: "grams" },
            amount: 400,
          },
        ],
      }),
    ];

    const result = transformPlanToGroceryItems(slots);

    expect(result[0].amount).toBe(200);
  });

  it("scales correctly for a recipe with 2 servings (no excess)", () => {
    // scalingFactor = 2 / 2 = 1
    const slots = [
      createSlot({
        servings: 2,
        servingMultiplierForNelson: 1.5,
        ingredients: [
          {
            ingredient: {
              id: "ing-pasta",
              name: "Pasta",
              icon: "spaghetti.svg",
              unitConversions: [{ unitId: "unit-grams", gramsPerUnit: 1 }],
              category: { name: "Grains & Pasta", sortOrder: 5 },
            },
            unit: { id: "unit-grams", name: "grams" },
            amount: 200,
          },
        ],
      }),
    ];

    const result = transformPlanToGroceryItems(slots);

    expect(result[0].amount).toBe(200);
  });

  it("scales all ingredients in a recipe by the same factor", () => {
    // servings=4 → scalingFactor = 2 / 4 = 0.5
    const slots = [
      createSlot({
        ingredients: [
          {
            ingredient: {
              id: "ing-chicken",
              name: "Chicken",
              icon: "chicken.svg",
              unitConversions: [{ unitId: "unit-grams", gramsPerUnit: 1 }],
              category: { name: "Meat & Poultry", sortOrder: 3 },
            },
            unit: { id: "unit-grams", name: "grams" },
            amount: 400,
          },
          {
            ingredient: {
              id: "ing-soy",
              name: "Soy Sauce",
              icon: "soy-sauce.svg",
              unitConversions: [{ unitId: "unit-ml", gramsPerUnit: 1.1 }],
              category: { name: "Sauces & Condiments", sortOrder: 6 },
            },
            unit: { id: "unit-ml", name: "ml" },
            amount: 40,
          },
          {
            ingredient: {
              id: "ing-rice",
              name: "Rice",
              icon: "rice.svg",
              unitConversions: [{ unitId: "unit-cups", gramsPerUnit: 185 }],
              category: { name: "Grains & Pasta", sortOrder: 5 },
            },
            unit: { id: "unit-cups", name: "cups" },
            amount: 2,
          },
        ],
      }),
    ];

    const result = transformPlanToGroceryItems(slots);

    const chicken = result.find((r) => r.ingredientName === "Chicken");
    const soy = result.find((r) => r.ingredientName === "Soy Sauce");
    const rice = result.find((r) => r.ingredientName === "Rice");
    expect(chicken!.amount).toBe(200);   // 400 * 0.5
    expect(soy!.amount).toBe(20);       // 40 * 0.5
    expect(rice!.amount).toBe(1);    // 2 * 0.5
  });

  // ── Icon threading ─────────────────────────────────────────────────────

  it("preserves ingredient icon through the pipeline", () => {
    const slots = [
      createSlot({
        servings: 2,
        servingMultiplierForNelson: 1,
        ingredients: [
          {
            ingredient: {
              id: "ing-tomato",
              name: "Tomato",
              icon: "tomato.svg",
              unitConversions: [{ unitId: "unit-grams", gramsPerUnit: 1 }],
              category: { name: "Produce", sortOrder: 1 },
            },
            unit: { id: "unit-grams", name: "grams" },
            amount: 200,
          },
        ],
      }),
    ];

    const result = transformPlanToGroceryItems(slots);

    expect(result[0].ingredientIcon).toBe("tomato.svg");
  });

  it("preserves null icon for ingredients without an icon", () => {
    const slots = [
      createSlot({
        servings: 2,
        servingMultiplierForNelson: 1,
        ingredients: [
          {
            ingredient: {
              id: "ing-tofu",
              name: "Firm Tofu",
              icon: null,
              unitConversions: [{ unitId: "unit-grams", gramsPerUnit: 1 }],
              category: { name: "Produce", sortOrder: 1 },
            },
            unit: { id: "unit-grams", name: "grams" },
            amount: 300,
          },
        ],
      }),
    ];

    const result = transformPlanToGroceryItems(slots);

    expect(result[0].ingredientIcon).toBeNull();
  });

  it("preserves icon when aggregating same ingredient across recipes", () => {
    const slots = [
      createSlot({
        name: "Recipe A",
        servings: 2,
        servingMultiplierForNelson: 1,
        ingredients: [
          {
            ingredient: {
              id: "ing-butter",
              name: "Butter",
              icon: "butter.svg",
              unitConversions: [{ unitId: "unit-grams", gramsPerUnit: 1 }],
              category: { name: "Dairy & Eggs", sortOrder: 2 },
            },
            unit: { id: "unit-grams", name: "grams" },
            amount: 50,
          },
        ],
      }),
      createSlot({
        name: "Recipe B",
        servings: 2,
        servingMultiplierForNelson: 1,
        ingredients: [
          {
            ingredient: {
              id: "ing-butter",
              name: "Butter",
              icon: "butter.svg",
              unitConversions: [{ unitId: "unit-grams", gramsPerUnit: 1 }],
              category: { name: "Dairy & Eggs", sortOrder: 2 },
            },
            unit: { id: "unit-grams", name: "grams" },
            amount: 30,
          },
        ],
      }),
    ];

    const result = transformPlanToGroceryItems(slots);

    expect(result).toHaveLength(1);
    expect(result[0].ingredientIcon).toBe("butter.svg");
    expect(result[0].amount).toBe(80);
  });

  it("preserves icon when converting different units to grams", () => {
    const slots = [
      createSlot({
        name: "Recipe A",
        servings: 2,
        servingMultiplierForNelson: 1,
        ingredients: [
          {
            ingredient: {
              id: "ing-flour",
              name: "Flour",
              icon: "flour.svg",
              unitConversions: [
                { unitId: "unit-cups", gramsPerUnit: 120 },
                { unitId: "unit-grams", gramsPerUnit: 1 },
              ],
              category: { name: "Baking", sortOrder: 6 },
            },
            unit: { id: "unit-cups", name: "cups" },
            amount: 2,
          },
        ],
      }),
      createSlot({
        name: "Recipe B",
        servings: 2,
        servingMultiplierForNelson: 1,
        ingredients: [
          {
            ingredient: {
              id: "ing-flour",
              name: "Flour",
              icon: "flour.svg",
              unitConversions: [
                { unitId: "unit-cups", gramsPerUnit: 120 },
                { unitId: "unit-grams", gramsPerUnit: 1 },
              ],
              category: { name: "Baking", sortOrder: 6 },
            },
            unit: { id: "unit-grams", name: "grams" },
            amount: 100,
          },
        ],
      }),
    ];

    const result = transformPlanToGroceryItems(slots);

    expect(result).toHaveLength(1);
    expect(result[0].ingredientIcon).toBe("flour.svg");
    // 2 cups * 120 g/cup = 240g + 100g = 340g
    expect(result[0].amount).toBe(340);
    expect(result[0].unitName).toBe("g");
  });

  it("preserves null icon for null-amount ingredients", () => {
    const slots = [
      createSlot({
        name: "Recipe A",
        ingredients: [
          {
            ingredient: {
              id: "ing-salt",
              name: "Salt",
              icon: null,
              unitConversions: [],
              category: { name: "Seasonings", sortOrder: 8 },
            },
            unit: { id: "unit-taste", name: "to taste" },
            amount: null,
          },
        ],
      }),
    ];

    const result = transformPlanToGroceryItems(slots);

    expect(result[0].ingredientIcon).toBeNull();
    expect(result[0].amount).toBeNull();
  });
});

// ============================================================================
// formatAmount
// ============================================================================

describe("formatAmount", () => {
  it("returns an integer as a whole number string", () => {
    expect(formatAmount(200)).toBe("200");
    expect(formatAmount(1)).toBe("1");
    expect(formatAmount(0)).toBe("0");
  });

  it("keeps clean decimals as-is", () => {
    expect(formatAmount(1.5)).toBe("1.5");
    expect(formatAmount(2.25)).toBe("2.25");
  });

  it("rounds long decimals to 2 decimal places", () => {
    expect(formatAmount(1.33333)).toBe("1.33");
    expect(formatAmount(0.66667)).toBe("0.67");
  });

  it("strips trailing zeros after rounding", () => {
    expect(formatAmount(1.10)).toBe("1.1");
    expect(formatAmount(2.00)).toBe("2");
    expect(formatAmount(3.50)).toBe("3.5");
  });

  it("handles very small amounts", () => {
    expect(formatAmount(0.01)).toBe("0.01");
    expect(formatAmount(0.001)).toBe("0");
  });

  it("handles large amounts", () => {
    expect(formatAmount(1000)).toBe("1000");
    expect(formatAmount(1500.75)).toBe("1500.75");
  });
});
