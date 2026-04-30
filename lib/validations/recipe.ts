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

const preprocessRequiredNumberInput = (
  message: string,
  schema: z.ZodNumber,
) =>
  z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === "string") {
      return Number(value);
    }
    return value;
  },
  // Force a single friendly message for empty/invalid numeric input first.
  z
    .any()
    .refine(
      (val) => typeof val === "number" && Number.isFinite(val),
      { message },
    )
    .transform((val) => val as number)
    .pipe(schema));

// Guard against floating-point artifacts while enforcing 0.5 increments.
const isHalfStepValue = (value: number): boolean => {
  const doubled = value * 2;
  return Math.abs(doubled - Math.round(doubled)) < 1e-9;
};

const recipeIngredientGroupSchema = z.object({
  id: z.string().min(1).optional(),
  tempGroupKey: z.string().min(1, { message: "Group key is required" }),
  name: z
    .string()
    // Keep validation copy short and action-oriented.
    .min(1, { message: "Enter a group name" })
    .max(50, { message: "Keep group name under 50 characters" })
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
      .min(1, { message: "Ingredient key is required" }),
    ingredientId: z.string().min(1, { message: "Choose an ingredient" }),
    amount: z
      .number()
      .positive()
      .min(0.01, { message: "Enter an amount above 0" })
      .nullish(),
    unitId: z
      .string()
      .min(1, { message: "Choose a unit" })
      .nullish()
      .transform((val) => val ?? null),
    nutritionTarget: nutritionTargetSchema.default("BOTH"),
    additionalInfo: z
      .string()
      .max(50, { message: "Keep additional info under 50 characters" })
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
        message: "Choose a unit before entering an amount",
      });
    }
  });

const recipeInstructionSchema = z.object({
  id: z.string().min(1).optional(),
  text: z
    .string()
    .min(1, { message: "Enter step text" })
    .transform((val) => val.trim()),
  linkedTempIngredientKeys: z.array(z.string().min(1)).default([]),
});

const recipeImageSchema = z.object({
  url: z.url(),
  isCover: z.boolean().default(false),
});

const recipeBaseSchema = z.object({
  name: z.string().min(1, { message: "Enter a recipe name" }),
  // Category form fields are explicit to keep UI semantics clear.
  mealOccasionCategoryIds: z.array(z.string()).default([]),
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
  handsOnTime: preprocessRequiredNumberInput(
    "Enter a hands-on time above 0",
    z.number()
      .int({ message: "Enter a hands-on time above 0" })
      .positive({ message: "Enter a hands-on time above 0" }),
  ),
  // Keep empty string values as missing so required checks trigger.
  totalTime: preprocessRequiredNumberInput(
    "Enter a total time above 0",
    z.number()
      .int({ message: "Enter a total time above 0" })
      .positive({ message: "Enter a total time above 0" }),
  ),
  // Keep empty string values as missing so required checks trigger.
  servings: preprocessRequiredNumberInput(
    "Enter an even number of portions above 0",
    z.number()
      .int({ message: "Enter an even number of portions above 0" })
      .min(2, { message: "Enter an even number of portions above 0" })
      .refine((value) => value % 2 === 0, {
        message: "Enter an even number of portions above 0",
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
      message: "Choose a multiplier in 0.5 steps",
    })),
  ingredientGroups: z.array(recipeIngredientGroupSchema).default([]),
  // Keep arrays required but allow empty collections for draft-like recipes.
  ingredients: z.array(recipeIngredientSchema),
  // Keep arrays required but allow empty collections for draft-like recipes.
  instructions: z.array(recipeInstructionSchema),
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