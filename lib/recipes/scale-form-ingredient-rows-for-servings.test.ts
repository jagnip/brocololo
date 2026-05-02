import { describe, expect, it } from "vitest";
import { scaleFormIngredientRowsForNewServings } from "@/lib/recipes/scale-form-ingredient-rows-for-servings";
import type { CreateRecipeFormValues } from "@/lib/validations/recipe";

/** Minimal row shape for scaler tests (resolver fills defaults on real submit). */
function row(partial: Partial<CreateRecipeFormValues["ingredients"][number]>) {
  return {
    tempIngredientKey: "k1",
    ingredientId: "ing-1",
    amount: 100,
    unitId: "u1",
    nutritionTarget: "BOTH" as const,
    additionalInfo: null,
    groupTempKey: null,
    position: 0,
    ...partial,
  } satisfies CreateRecipeFormValues["ingredients"][number];
}

describe("scaleFormIngredientRowsForNewServings", () => {
  it("doubles amounts when servings double (4 → 8)", () => {
    const rows = [row({ amount: 50 }), row({ tempIngredientKey: "k2", amount: 1.5 })];
    const out = scaleFormIngredientRowsForNewServings(rows, 8, 4);
    expect(out[0]?.amount).toBe(100);
    expect(out[1]?.amount).toBe(3);
  });

  it("leaves rows unchanged when baseline equals next servings", () => {
    const rows = [row({ amount: 50 })];
    const out = scaleFormIngredientRowsForNewServings(rows, 4, 4);
    expect(out[0]?.amount).toBe(50);
  });

  it("skips rows with null amount", () => {
    const rows = [row({ amount: null }), row({ tempIngredientKey: "k2", amount: 10 })];
    const out = scaleFormIngredientRowsForNewServings(rows, 8, 4);
    expect(out[0]?.amount).toBeNull();
    expect(out[1]?.amount).toBe(20);
  });

  it("returns same array reference for empty input", () => {
    const rows: CreateRecipeFormValues["ingredients"] = [];
    const out = scaleFormIngredientRowsForNewServings(rows, 8, 4);
    expect(out).toEqual([]);
  });

  it("returns unchanged rows for non-positive baseline", () => {
    const rows = [row({ amount: 10 })];
    expect(scaleFormIngredientRowsForNewServings(rows, 8, 0)).toEqual(rows);
    expect(scaleFormIngredientRowsForNewServings(rows, 8, -2)).toEqual(rows);
  });

  it("returns unchanged rows for non-positive next servings", () => {
    const rows = [row({ amount: 10 })];
    expect(scaleFormIngredientRowsForNewServings(rows, 0, 4)).toEqual(rows);
  });

  it("preserves non-amount fields on scaled rows", () => {
    const rows = [
      row({
        tempIngredientKey: "abc",
        ingredientId: "ing-x",
        nutritionTarget: "PRIMARY_ONLY",
        additionalInfo: "diced",
        position: 3,
      }),
    ];
    const out = scaleFormIngredientRowsForNewServings(rows, 6, 2);
    expect(out[0]).toMatchObject({
      tempIngredientKey: "abc",
      ingredientId: "ing-x",
      nutritionTarget: "PRIMARY_ONLY",
      additionalInfo: "diced",
      position: 3,
      amount: 300,
    });
  });
});
