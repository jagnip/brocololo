import { describe, expect, it } from "vitest";
import {
  createRecipeSchema,
  updateRecipeSchema,
} from "../validations/recipe";
import {
  formatIngredientAmount,
  formatInstructionIngredientBadge,
  getIngredientDisplay,
} from "../recipes/helpers";

const baseRecipeInput = {
  name: "Tomato Pasta",
  // Keep explicit fields aligned with the updated recipe form contract.
  flavourCategoryId: "flavour-cat-id-1",
  proteinCategoryId: "protein-cat-id-1",
  typeCategoryId: "recipe-type-cat-id-1",
  images: [
    { url: "https://example.com/one.jpg", isCover: false },
    { url: "https://example.com/two.jpg", isCover: false },
  ],
  handsOnTime: 15,
  totalTime: 30,
  servings: 2,
  servingMultiplierForNelson: 1,
  ingredientGroups: [
    {
      tempGroupKey: "grp-1",
      name: "Sauce",
      position: 0,
    },
  ],
  ingredients: [
    {
      tempIngredientKey: "tmp-1",
      ingredientId: "ing-1",
      amount: 2,
      unitId: "unit-1",
      additionalInfo: "  Chopped  ",
      groupTempKey: "grp-1",
      position: 0,
    },
    {
      tempIngredientKey: "tmp-2",
      ingredientId: "ing-2",
      amount: null,
      unitId: "unit-2",
      additionalInfo: "   ",
      groupTempKey: null,
      position: 0,
    },
  ],
  instructions: [
    {
      text: "Step one",
      linkedTempIngredientKeys: ["tmp-1"],
    },
    {
      text: "Step two",
      linkedTempIngredientKeys: [],
    },
  ],
  notes: " note A \n\n note B ",
  excludeFromPlanner: false,
};

describe("createRecipeSchema", () => {
  it("transforms notes into a trimmed array", () => {
    const parsed = createRecipeSchema.parse(baseRecipeInput);

    expect(parsed.notes).toEqual(["note A", "note B"]);
  });

  it("sets first image as cover when none is selected", () => {
    const parsed = createRecipeSchema.parse(baseRecipeInput);

    expect(parsed.images[0]?.isCover).toBe(true);
    expect(parsed.images[1]?.isCover).toBe(false);
  });

  it("normalizes additionalInfo and defaults nutritionTarget", () => {
    const parsed = createRecipeSchema.parse(baseRecipeInput);

    expect(parsed.ingredients[0]?.additionalInfo).toBe("chopped");
    expect(parsed.ingredients[1]?.additionalInfo).toBeNull();
    expect(parsed.ingredients[0]?.nutritionTarget).toBe("BOTH");
    expect(parsed.ingredients[1]?.nutritionTarget).toBe("BOTH");
  });

  it("keeps group assignment and 0-based positions", () => {
    const parsed = createRecipeSchema.parse(baseRecipeInput);

    expect(parsed.ingredientGroups[0]?.name).toBe("Sauce");
    expect(parsed.ingredientGroups[0]?.position).toBe(0);
    expect(parsed.ingredients[0]?.groupTempKey).toBe("grp-1");
    expect(parsed.ingredients[0]?.position).toBe(0);
    expect(parsed.ingredients[1]?.groupTempKey).toBeNull();
    expect(parsed.ingredients[1]?.position).toBe(0);
  });

  it("supports recipes without any ingredient groups", () => {
    const parsed = createRecipeSchema.parse({
      ...baseRecipeInput,
      ingredientGroups: [],
      ingredients: baseRecipeInput.ingredients.map((ingredient) => ({
        ...ingredient,
        groupTempKey: null,
      })),
    });

    expect(parsed.ingredientGroups).toEqual([]);
    expect(parsed.ingredients.every((ingredient) => ingredient.groupTempKey === null)).toBe(
      true,
    );
  });

  it("allows instruction steps without linked ingredients", () => {
    const parsed = createRecipeSchema.parse(baseRecipeInput);
    expect(parsed.instructions[1]?.linkedTempIngredientKeys).toEqual([]);
  });

  it("allows ingredient rows with null unit and null amount", () => {
    const parsed = createRecipeSchema.parse({
      ...baseRecipeInput,
      ingredients: [
        {
          ...baseRecipeInput.ingredients[0],
          unitId: null,
          amount: null,
        },
      ],
    });

    expect(parsed.ingredients[0]?.unitId).toBeNull();
    expect(parsed.ingredients[0]?.amount).toBeNull();
  });

  it("rejects amount when unit is null", () => {
    const result = createRecipeSchema.safeParse({
      ...baseRecipeInput,
      ingredients: [
        {
          ...baseRecipeInput.ingredients[0],
          unitId: null,
          amount: 2,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("trims instruction step text", () => {
    const parsed = createRecipeSchema.parse({
      ...baseRecipeInput,
      instructions: [
        {
          text: "  Simmer for 5 min  ",
          linkedTempIngredientKeys: ["tmp-1"],
        },
      ],
    });

    expect(parsed.instructions[0]?.text).toBe("Simmer for 5 min");
  });

  it("rejects an empty instructions array", () => {
    const result = createRecipeSchema.safeParse({
      ...baseRecipeInput,
      instructions: [],
    });

    expect(result.success).toBe(false);
  });

  it("requires tempIngredientKey for each ingredient", () => {
    const invalidInput = {
      ...baseRecipeInput,
      ingredients: [
        {
          ingredientId: "ing-1",
          amount: 2,
          unitId: "unit-1",
        },
      ],
    };
    const result = createRecipeSchema.safeParse(invalidInput);

    expect(result.success).toBe(false);
  });

  it("rejects empty strings for required recipe numeric fields", () => {
    const cases = [
      { field: "handsOnTime", value: "" },
      { field: "totalTime", value: "" },
      { field: "servings", value: "" },
    ] as const;

    cases.forEach(({ field, value }) => {
      const result = createRecipeSchema.safeParse({
        ...baseRecipeInput,
        [field]: value,
      });

      expect(result.success).toBe(false);
    });
  });

  it("defaults Nelson multiplier to 1 when it is an empty string", () => {
    const parsed = createRecipeSchema.parse({
      ...baseRecipeInput,
      servingMultiplierForNelson: "",
    });

    expect(parsed.servingMultiplierForNelson).toBe(1);
  });

  it("defaults Nelson multiplier to 1 when it is omitted", () => {
    const inputWithoutMultiplier = { ...baseRecipeInput };
    delete (inputWithoutMultiplier as { servingMultiplierForNelson?: number })
      .servingMultiplierForNelson;

    const parsed = createRecipeSchema.parse(inputWithoutMultiplier);
    expect(parsed.servingMultiplierForNelson).toBe(1);
  });

  it("accepts numeric strings for recipe numeric fields", () => {
    const parsed = createRecipeSchema.parse({
      ...baseRecipeInput,
      handsOnTime: "15",
      totalTime: "30",
      servings: "2",
      servingMultiplierForNelson: "1",
    });

    expect(parsed.handsOnTime).toBe(15);
    expect(parsed.totalTime).toBe(30);
    expect(parsed.servings).toBe(2);
    expect(parsed.servingMultiplierForNelson).toBe(1);
  });

  it("rejects servings lower than 2", () => {
    const result = createRecipeSchema.safeParse({
      ...baseRecipeInput,
      servings: 1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects odd servings", () => {
    const result = createRecipeSchema.safeParse({
      ...baseRecipeInput,
      servings: 3,
    });

    expect(result.success).toBe(false);
  });

  it("accepts fractional Nelson multiplier values greater than or equal to 1", () => {
    const parsed = createRecipeSchema.parse({
      ...baseRecipeInput,
      servingMultiplierForNelson: "1.5",
    });

    expect(parsed.servingMultiplierForNelson).toBe(1.5);
  });

  it("accepts half-step Nelson multiplier values", () => {
    // Keep parser behavior aligned with the form's 0.5-step input contract.
    const parsed = createRecipeSchema.parse({
      ...baseRecipeInput,
      servingMultiplierForNelson: "2.5",
    });

    expect(parsed.servingMultiplierForNelson).toBe(2.5);
  });

  it("accepts Nelson multiplier as numeric string with trailing .0", () => {
    const parsed = createRecipeSchema.parse({
      ...baseRecipeInput,
      servingMultiplierForNelson: "1.0",
    });

    expect(parsed.servingMultiplierForNelson).toBe(1);
  });

  it("rejects invalid Nelson multiplier values", () => {
    // Reject values that are out of range, non-numeric, or not in 0.5 increments.
    const invalidValues = [0, -1, "abc", 1.2] as const;

    invalidValues.forEach((servingMultiplierForNelson) => {
      const result = createRecipeSchema.safeParse({
        ...baseRecipeInput,
        servingMultiplierForNelson,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("updateRecipeSchema", () => {
  it("keeps parity with create schema transforms", () => {
    const parsed = updateRecipeSchema.parse(baseRecipeInput);

    expect(parsed.notes).toEqual(["note A", "note B"]);
    expect(parsed.images[0]?.isCover).toBe(true);
    expect(parsed.ingredients[0]?.additionalInfo).toBe("chopped");
  });
});

describe("formatInstructionIngredientBadge", () => {
  it("shows less-than floor for tiny non-zero amounts", () => {
    const label = formatInstructionIngredientBadge({
      rawAmount: 0.04,
      displayAmount: "0.0",
      displayUnitName: "g",
      ingredientName: "salt",
      additionalInfo: null,
    });

    expect(label).toBe("<0.1 g salt");
  });

  it("shows ingredient name only when amount is null", () => {
    const label = formatInstructionIngredientBadge({
      rawAmount: null,
      displayAmount: null,
      displayUnitName: "g",
      ingredientName: "salt",
      additionalInfo: "to taste",
    });

    expect(label).toBe("salt (to taste)");
  });

  it("omits trailing .0 for whole numbers", () => {
    const label = formatInstructionIngredientBadge({
      rawAmount: 50,
      displayAmount: "50.0",
      displayUnitName: "g",
      ingredientName: "carrot",
      additionalInfo: null,
    });

    expect(label).toBe("50 g carrot");
  });
});

describe("formatIngredientAmount", () => {
  it("returns whole numbers without decimal suffix", () => {
    expect(formatIngredientAmount(50, 1)).toBe("50");
  });

  it("keeps one decimal when there is a meaningful fraction", () => {
    expect(formatIngredientAmount(50.5, 1)).toBe("50.5");
  });
});

describe("getIngredientDisplay amount formatting", () => {
  const conversions = [
    {
      unitId: "unit-g",
      gramsPerUnit: 1,
      unit: { id: "unit-g", name: "g" },
    },
  ];

  it("shows whole-number amounts without trailing .0", () => {
    const display = getIngredientDisplay(
      50,
      "unit-g",
      "g",
      "unit-g",
      conversions,
      1,
      1,
    );

    expect(display.displayAmount).toBe("50");
  });

  it("keeps decimal amounts in display labels", () => {
    const display = getIngredientDisplay(
      50.5,
      "unit-g",
      "g",
      "unit-g",
      conversions,
      1,
      1,
    );

    expect(display.displayAmount).toBe("50.5");
  });

  it("returns name-only display data when unit is not selected", () => {
    const display = getIngredientDisplay(
      50,
      null,
      null,
      null,
      conversions,
      1,
      1,
    );

    expect(display.displayAmount).toBeNull();
    expect(display.rawAmount).toBeNull();
    expect(display.displayUnitName).toBe("");
  });
});
