import { describe, expect, it } from "vitest";
import { makeIngredientSchema } from "../validations/ingredient";

const gramsUnitId = "unit-g";
const cupUnitId = "unit-cup";

const baseIngredientInput = {
  name: "  Banana  ",
  icon: " banana.svg ",
  supermarketUrl: "https://example.com/banana",
  calories: 89,
  proteins: 1.1,
  fats: 0.3,
  carbs: 22.8,
  categoryId: "cat-produce",
  // Keep tests aligned with current schema: default unit is required.
  defaultUnitId: gramsUnitId,
  unitConversions: [{ unitId: gramsUnitId, gramsPerUnit: 1 }],
};

describe("makeIngredientSchema", () => {
  it("accepts ingredient with required grams conversion", () => {
    const schema = makeIngredientSchema(gramsUnitId);
    const result = schema.safeParse(baseIngredientInput);

    expect(result.success).toBe(true);
  });

  it("allows optional additional conversions besides grams", () => {
    const schema = makeIngredientSchema(gramsUnitId);
    const result = schema.safeParse({
      ...baseIngredientInput,
      unitConversions: [
        { unitId: gramsUnitId, gramsPerUnit: 1 },
        { unitId: cupUnitId, gramsPerUnit: 100 },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects input without grams conversion", () => {
    const schema = makeIngredientSchema(gramsUnitId);
    const result = schema.safeParse({
      ...baseIngredientInput,
      unitConversions: [{ unitId: cupUnitId, gramsPerUnit: 100 }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate conversion units", () => {
    const schema = makeIngredientSchema(gramsUnitId);
    const result = schema.safeParse({
      ...baseIngredientInput,
      unitConversions: [
        { unitId: gramsUnitId, gramsPerUnit: 1 },
        { unitId: gramsUnitId, gramsPerUnit: 2 },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-positive gramsPerUnit", () => {
    const schema = makeIngredientSchema(gramsUnitId);
    const result = schema.safeParse({
      ...baseIngredientInput,
      unitConversions: [{ unitId: gramsUnitId, gramsPerUnit: 0 }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects negative nutrition values", () => {
    const schema = makeIngredientSchema(gramsUnitId);
    const result = schema.safeParse({
      ...baseIngredientInput,
      calories: -1,
    });

    expect(result.success).toBe(false);
  });

  it("trims name/icon and keeps optional fields nullable", () => {
    const schema = makeIngredientSchema(gramsUnitId);
    const parsed = schema.parse({
      ...baseIngredientInput,
      icon: " banana.svg ",
      supermarketUrl: " https://example.com/banana ",
    });

    expect(parsed.name).toBe("Banana");
    expect(parsed.icon).toBe("banana.svg");
    expect(parsed.supermarketUrl).toBe("https://example.com/banana");
  });

  it("coerces numeric strings for nutrition and conversion", () => {
    const schema = makeIngredientSchema(gramsUnitId);
    const parsed = schema.parse({
      ...baseIngredientInput,
      calories: "100",
      proteins: "2.5",
      fats: "0.2",
      carbs: "15",
      unitConversions: [{ unitId: gramsUnitId, gramsPerUnit: "1.5" }],
    });

    expect(parsed.calories).toBe(100);
    expect(parsed.proteins).toBe(2.5);
    expect(parsed.unitConversions[0]?.gramsPerUnit).toBe(1.5);
  });

  it("accepts nutrition values with two decimal places", () => {
    const schema = makeIngredientSchema(gramsUnitId);
    const parsed = schema.parse({
      ...baseIngredientInput,
      calories: "100.25",
      proteins: "2.55",
      fats: "0.23",
      carbs: "15.99",
    });

    expect(parsed.calories).toBe(100.25);
    expect(parsed.proteins).toBe(2.55);
    expect(parsed.fats).toBe(0.23);
    expect(parsed.carbs).toBe(15.99);
  });

  it("rejects empty strings for required nutrition fields", () => {
    const schema = makeIngredientSchema(gramsUnitId);
    const fields = ["calories", "proteins", "fats", "carbs"] as const;

    fields.forEach((field) => {
      const result = schema.safeParse({
        ...baseIngredientInput,
        [field]: "",
      });

      expect(result.success).toBe(false);
    });
  });

  it("accepts explicit zero values for nutrition fields", () => {
    const schema = makeIngredientSchema(gramsUnitId);
    const parsed = schema.parse({
      ...baseIngredientInput,
      calories: 0,
      proteins: 0,
      fats: 0,
      carbs: 0,
    });

    expect(parsed.calories).toBe(0);
    expect(parsed.proteins).toBe(0);
    expect(parsed.fats).toBe(0);
    expect(parsed.carbs).toBe(0);
  });
});
