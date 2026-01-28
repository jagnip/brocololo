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
  unitId: z.string().min(1, { message: "Unit is required" }),
  gramsPerUnit: z.coerce
    .number()
    .positive({ message: "Grams per unit must be greater than 0" }),
});

const ingredientBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required" }),
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
    .url({ message: "Supermarket URL must be a valid URL" })
    .nullish()
    .transform((value) => {
      if (!value) return null;
      return value === "" ? null : value;
    }),
  // Keep empty string values as missing so required checks trigger.
  calories: preprocessNumberInput(
    z.number().min(0, {
      message: "Calories must be greater than or equal to 0",
    }),
  ),
  // Keep empty string values as missing so required checks trigger.
  proteins: preprocessNumberInput(
    z.number().min(0, {
      message: "Proteins must be greater than or equal to 0",
    }),
  ),
  // Keep empty string values as missing so required checks trigger.
  fats: preprocessNumberInput(
    z.number().min(0, {
      message: "Fats must be greater than or equal to 0",
    }),
  ),
  // Keep empty string values as missing so required checks trigger.
  carbs: preprocessNumberInput(
    z.number().min(0, {
      message: "Carbs must be greater than or equal to 0",
    }),
  ),
  categoryId: z.string().min(1, { message: "Category is required" }),
  // Optional for backward compatibility while frontend wiring is added.
  defaultUnitId: z
    .string()
    .min(1, { message: "Default unit is required" })
    .nullish()
    .transform((value) => value ?? null),
  unitConversions: z
    .array(ingredientUnitConversionSchema)
    .min(1, { message: "At least one unit conversion is required" }),
});

export function makeIngredientSchema(gramsUnitId: string) {
  return ingredientBaseSchema.superRefine((data, ctx) => {
    // Keep "g" as a mandatory baseline conversion for every ingredient.
    const hasGrams = data.unitConversions.some((conversion) => conversion.unitId === gramsUnitId);
    if (!hasGrams) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitConversions"],
        message: "Conversion for unit 'g' is required",
      });
    }

    // Prevent duplicate unit rows in the same ingredient conversion list.
    const seenUnits = new Set<string>();
    data.unitConversions.forEach((conversion, index) => {
      if (seenUnits.has(conversion.unitId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["unitConversions", index, "unitId"],
          message: "Duplicate unit conversion is not allowed",
        });
      }
      seenUnits.add(conversion.unitId);
    });

    if (data.unitConversions.length > 0 && data.defaultUnitId == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["defaultUnitId"],
        message: "Default unit is required",
      });
    }

    if (
      data.defaultUnitId != null &&
      !data.unitConversions.some((conversion) => conversion.unitId === data.defaultUnitId)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["defaultUnitId"],
        message: "Default unit must be one of the configured unit conversions",
      });
    }
  });
}

export type IngredientFormValues = z.input<typeof ingredientBaseSchema>;
export type IngredientPayload = z.infer<typeof ingredientBaseSchema>;
