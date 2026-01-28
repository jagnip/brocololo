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

// Guard against floating-point artifacts while enforcing 0.5 increments.
const isHalfStepValue = (value: number): boolean => {
  const doubled = value * 2;
  return Math.abs(doubled - Math.round(doubled)) < 1e-9;
};

const recipeIngredientGroupSchema = z.object({
  id: z.string().min(1).optional(),
  tempGroupKey: z.string().min(1, { message: "Temp group key is required" }),
  name: z
    .string()
    .min(1, { message: "Group name is required" })
    .max(50, { message: "Group name must be 50 characters or less" })
    .transform((val) => val.trim()),
  // Keep ingredient group ordering explicit and always 0-based.
  position: z.coerce.number().int().min(0).default(0),
});

// Keep ingredient nutrition targeting explicit by role.
export const nutritionTargetSchema = z.enum([
  "BOTH",
  "PRIMARY_ONLY",
  "SECONDARY_ONLY",
]);

const recipeIngredientSchema = z
  .object({
    id: z.string().min(1).optional(),
    tempIngredientKey: z
      .string()
      .min(1, { message: "Temp ingredient key is required" }),
    ingredientId: z.string().min(1, { message: "Ingredient is required" }),
    amount: z
      .number()
      .positive()
      .min(0.01, { message: "Amount must be a positive number" })
      .nullish(),
    unitId: z
      .string()
      .min(1, { message: "Unit is required" })
      .nullish()
      .transform((val) => val ?? null),
    nutritionTarget: nutritionTargetSchema.default("BOTH"),
    additionalInfo: z
      .string()
      .max(50, { message: "Additional info must be 50 characters or less" })
      .nullish()
      .transform((val) => {
        if (!val) return null;
        const trimmed = val.trim();
        return trimmed === "" ? null : trimmed.toLowerCase();
      }),
    // Null means ingredient is in the ungrouped lane.
    groupTempKey: z
      .string()
      .min(1)
      .nullish()
      .transform((val) => val ?? null),
    // Keep ingredient ordering explicit and always 0-based.
    position: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((ingredient, ctx) => {
    if (ingredient.unitId == null && ingredient.amount != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: "Amount must be empty when unit is not selected",
      });
    }
  });

const recipeInstructionSchema = z.object({
  id: z.string().min(1).optional(),
  text: z
    .string()
    .min(1, { message: "Step text is required" })
    .transform((val) => val.trim()),
  linkedTempIngredientKeys: z.array(z.string().min(1)).default([]),
});

const recipeImageSchema = z.object({
  url: z.url(),
  isCover: z.boolean().default(false),
});

const recipeBaseSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  // Category form fields are explicit to keep UI semantics clear.
  flavourCategoryId: z.string().min(1, { message: "Flavour is required" }),
  proteinCategoryId: z.string().nullish(),
  typeCategoryId: z.string().nullish(),
  images: z
    .array(recipeImageSchema)
    .transform((images) => {
      // Automatically set first image as cover if images exist
      if (images.length > 0 && !images.some((img) => img.isCover === true)) {
        images[0].isCover = true;
      }
      return images;
    })
    .default([]),
  // Keep empty string values as missing so required checks trigger.
  handsOnTime: preprocessNumberInput(
    z.number()
      .int({ message: "Hands-on time must be a positive number" })
      .positive({ message: "Hands-on time must be a positive number" }),
  ),
  // Keep empty string values as missing so required checks trigger.
  totalTime: preprocessNumberInput(
    z.number()
      .int({ message: "Total time must be a positive number" })
      .positive({ message: "Total time must be a positive number" }),
  ),
  // Keep empty string values as missing so required checks trigger.
  servings: preprocessNumberInput(
    z.number()
      .int({ message: "Portions must be a positive number" })
      .min(2, { message: "Portions must be at least 2" })
      .refine((value) => value % 2 === 0, {
        message: "Portions must be an even number",
      }),
  ),
  // Keep this optional in the form and normalize missing/blank input to 1.
  servingMultiplierForNelson: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return 1;
    }
    if (typeof value === "string") {
      return Number(value);
    }
    return value;
  }, z
    .number()
    .min(1)
    .refine((value) => isHalfStepValue(value), {
      message: "Nelson's serving multiplier must be in increments of 0.5",
    })),
  ingredientGroups: z.array(recipeIngredientGroupSchema).default([]),
  ingredients: z.array(recipeIngredientSchema).min(1, { message: "At least one ingredient is required" }),
  instructions: z.array(recipeInstructionSchema).min(1, { message: "At least one instruction step is required" }),
  notes: z.string().transform((val) => {
    if (!val || val.trim() === "") return [];
    const lines = val.split("\n").map(line => line.trim()).filter(line => line !== "");
    return lines;
  }),
  excludeFromPlanner: z.boolean().default(false),
});

export const createRecipeSchema = recipeBaseSchema;
export const updateRecipeSchema = recipeBaseSchema;

export type CreateRecipeFormValues = z.input<typeof createRecipeSchema>;
export type CreateRecipePayload = z.infer<typeof createRecipeSchema>;

export type UpdateRecipeFormValues = z.input<typeof updateRecipeSchema>;
export type UpdateRecipePayload = z.infer<typeof updateRecipeSchema>;

export type RecipeIngredientGroupInputType = z.input<typeof recipeIngredientGroupSchema>;
export type RecipeIngredientInputType = z.input<typeof recipeIngredientSchema>;