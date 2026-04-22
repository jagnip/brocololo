import { describe, expect, it } from "vitest";
import {
  sanitizeInstructionRows,
  sanitizeRecipeFormValuesForSubmit,
} from "./recipe-form";

describe("recipe form submit sanitization", () => {
  it("drops blank instruction placeholders", () => {
    const rows = [
      { text: "  ", linkedTempIngredientKeys: [] as string[] },
      { text: "Chop onions", linkedTempIngredientKeys: [] as string[] },
      { text: "\n\t", linkedTempIngredientKeys: [] as string[] },
    ];

    const result = sanitizeInstructionRows(rows);

    expect(result).toEqual([
      { text: "Chop onions", linkedTempIngredientKeys: [] },
    ]);
  });

  it("preserves ingredient-only rows while sanitizing instructions", () => {
    const ingredientOnlyRow = {
      tempIngredientKey: "tmp-1",
      ingredientId: "ing-1",
      amount: null,
      unitId: null,
      nutritionTarget: "BOTH" as const,
      additionalInfo: null,
      groupTempKey: null,
      position: 0,
    };
    const values = {
      ingredientGroups: [],
      ingredients: [ingredientOnlyRow],
      instructions: [
        { text: "", linkedTempIngredientKeys: [] as string[] },
        { text: "Mix ingredients", linkedTempIngredientKeys: [] as string[] },
      ],
    };

    const result = sanitizeRecipeFormValuesForSubmit(values);

    expect(result.ingredients).toEqual([ingredientOnlyRow]);
    expect(result.instructions).toEqual([
      { text: "Mix ingredients", linkedTempIngredientKeys: [] },
    ]);
  });

  it("drops ingredient placeholders without selected ingredient", () => {
    const values = {
      ingredientGroups: [],
      ingredients: [
        {
          tempIngredientKey: "tmp-empty",
          ingredientId: "",
          amount: null,
          unitId: null,
          nutritionTarget: "BOTH" as const,
          additionalInfo: null,
          groupTempKey: null,
          position: 0,
        },
        {
          tempIngredientKey: "tmp-selected",
          ingredientId: "ing-1",
          amount: null,
          unitId: null,
          nutritionTarget: "BOTH" as const,
          additionalInfo: null,
          groupTempKey: null,
          position: 1,
        },
      ],
      instructions: [],
    };

    const result = sanitizeRecipeFormValuesForSubmit(values);

    expect(result.ingredients).toHaveLength(1);
    expect(result.ingredients[0]?.ingredientId).toBe("ing-1");
  });

  it("drops blank-named groups and ungroups their ingredient rows", () => {
    const values = {
      ingredientGroups: [
        {
          tempGroupKey: "grp-empty",
          name: "   ",
          position: 0,
        },
        {
          tempGroupKey: "grp-valid",
          name: "Sauce",
          position: 1,
        },
      ],
      ingredients: [
        {
          tempIngredientKey: "tmp-1",
          ingredientId: "ing-1",
          amount: null,
          unitId: null,
          nutritionTarget: "BOTH" as const,
          additionalInfo: null,
          groupTempKey: "grp-empty",
          position: 0,
        },
        {
          tempIngredientKey: "tmp-2",
          ingredientId: "ing-2",
          amount: null,
          unitId: null,
          nutritionTarget: "BOTH" as const,
          additionalInfo: null,
          groupTempKey: "grp-valid",
          position: 1,
        },
      ],
      instructions: [],
    };

    const result = sanitizeRecipeFormValuesForSubmit(values);

    expect(result.ingredientGroups).toEqual([
      { tempGroupKey: "grp-valid", name: "Sauce", position: 1 },
    ]);
    expect(result.ingredients[0]?.groupTempKey).toBeNull();
    expect(result.ingredients[1]?.groupTempKey).toBe("grp-valid");
  });
});
