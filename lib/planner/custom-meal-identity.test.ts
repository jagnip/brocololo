import { describe, expect, it } from "vitest";
import {
  getCustomMealContentKey,
  getRollingCustomMealKey,
} from "./custom-meal-identity";

describe("custom meal identity", () => {
  const rice = { ingredientId: "rice", unitId: "g", amount: 100 };
  const beans = { ingredientId: "beans", unitId: null, amount: 1 };

  it("ignores ingredient order and name casing", () => {
    expect(getCustomMealContentKey({ name: " Bowl ", ingredients: [rice, beans] }))
      .toBe(getCustomMealContentKey({ name: "bowl", ingredients: [beans, rice] }));
  });

  it("keeps meal occasions distinct for rolling", () => {
    const meal = { name: "Bowl", ingredients: [rice] };
    expect(getRollingCustomMealKey("BREAKFAST", meal))
      .not.toBe(getRollingCustomMealKey("DINNER", meal));
  });
});
