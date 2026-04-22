import { z } from "zod";

const preprocessNumberInput = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === "string") {
      return Number(value);
    }
    return value;
  }, schema);

const ingredientUnitConversionSchema = z.object({
  unitId: z.string().min(1, { message: "Choose a unit" }),
  gramsPerUnit: z.coerce
    .number()
    .positive({ message: "Enter grams per unit above 0" }),
});

const ingredientBaseSchema = z.object({
  name: z
    .string()
    .trim()
    // Keep messages simple and user-focused.
    .min(1, { message: "Enter an ingredient name" }),
  brand: z
    .string()
    .max(100, { message: "Keep brand name under 100 characters" })
    .nullish()
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    }),
  icon: z
    .string()
    .max(200, { message: "Icon filename is too long" })
    .nullish()
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    }),
  supermarketUrl: z
    .string()
    .trim()
    .url({ message: "Enter a valid URL (include https://)" })
    .nullish()
    .transform((value) => {
      if (!value) return null;
      return value === "" ? null : value;
    }),
  // Keep empty string values as missing so required checks trigger.
  calories: preprocessNumberInput(
    z.number().min(0, {
      message: "Enter calories as 0 or more",
    }),
  ),
  // Keep empty string values as missing so required checks trigger.
  proteins: preprocessNumberInput(
    z.number().min(0, {
      message: "Enter proteins as 0 or more",
    }),
  ),
  // Keep empty string values as missing so required checks trigger.
  fats: preprocessNumberInput(
    z.number().min(0, {
      message: "Enter fats as 0 or more",
    }),
  ),
  // Keep empty string values as missing so required checks trigger.
  carbs: preprocessNumberInput(
    z.number().min(0, {
      message: "Enter carbs as 0 or more",
    }),
  ),
  categoryId: z.string().min(1, { message: "Choose a category" }),
  // Optional for backward compatibility while frontend wiring is added.
  defaultUnitId: z
    .string()
    .min(1, { message: "Choose a default unit" })
    .nullish()
    .transform((value) => value ?? null),
  unitConversions: z
    .array(ingredientUnitConversionSchema)
    .min(1, { message: "Add at least one unit conversion" }),
});

export function makeIngredientSchema(gramsUnitId: string) {
  return ingredientBaseSchema.superRefine((data, ctx) => {
    // Keep "g" as a mandatory baseline conversion for every ingredient.
    const hasGrams = data.unitConversions.some((conversion) => conversion.unitId === gramsUnitId);
    if (!hasGrams) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitConversions"],
        message: "Add a grams (g) conversion",
      });
    }

    // Prevent duplicate unit rows in the same ingredient conversion list.
    const seenUnits = new Set<string>();
    data.unitConversions.forEach((conversion, index) => {
      if (seenUnits.has(conversion.unitId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["unitConversions", index, "unitId"],
          message: "This unit is already added",
        });
      }
      seenUnits.add(conversion.unitId);
    });

    if (data.unitConversions.length > 0 && data.defaultUnitId == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["defaultUnitId"],
        message: "Choose a default unit",
      });
    }

    if (
      data.defaultUnitId != null &&
      !data.unitConversions.some((conversion) => conversion.unitId === data.defaultUnitId)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["defaultUnitId"],
        message: "Default unit must match your conversions",
      });
    }
  });
}

export type IngredientFormValues = z.input<typeof ingredientBaseSchema>;
export type IngredientPayload = z.infer<typeof ingredientBaseSchema>;
