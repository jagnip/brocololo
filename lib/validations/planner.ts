import { z } from "zod";

const plannerMealTypeSchema = z.enum(["BREAKFAST", "LUNCH", "DINNER"]);

const dateRangeSchema = z
  .object({
    start: z.string().min(1, "Start date is required"),
    end: z.string().min(1, "End date is required"),
  })
  .refine(
    ({ start, end }) => {
      const startDate = new Date(start);
      const endDate = new Date(end);
      return !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime());
    },
    {
      message: "Invalid date range",
      path: ["start"],
    },
  );

const timeLimitField = z.coerce
  .number()
  .int()
  .positive()
  .nullable();

const dayTimeLimitsSchema = z.object({
  date: z.string(),
  breakfastHandsOnMax: timeLimitField,
  lunchHandsOnMax: timeLimitField,
  dinnerHandsOnMax: timeLimitField,
  breakfastTotalMax: timeLimitField,
  lunchTotalMax: timeLimitField,
  dinnerTotalMax: timeLimitField,
});

const mealAudienceIdsSchema = z
  .array(z.string().min(1))
  .min(1, "Choose at least one person");

const dayAudienceByMealSchema = z.object({
  date: z.string(),
  breakfastFamilyMemberIds: mealAudienceIdsSchema,
  lunchFamilyMemberIds: mealAudienceIdsSchema,
  dinnerFamilyMemberIds: mealAudienceIdsSchema,
});

export const planCustomMealIngredientSchema = z.object({
  ingredientId: z.string().min(1),
  unitId: z.string().min(1).nullable(),
  amount: z.coerce.number().positive().nullable(),
});

export const planCustomMealSchema = z.object({
  name: z.string().trim().min(1, "Meal name is required"),
  ingredients: z.array(planCustomMealIngredientSchema).max(200),
});

const rollingRecipeSchema = z.object({
  kind: z.literal("recipe").optional(),
  recipeId: z.string(),
  meals: z.coerce.number().int().min(1),
  alreadyCooked: z.boolean().default(false).optional(),
});

const rollingCustomMealSchema = z.object({
  kind: z.literal("custom"),
  mealType: plannerMealTypeSchema,
  customMeal: planCustomMealSchema,
  meals: z.coerce.number().int().min(1),
});

const rollingMealSchema = z.discriminatedUnion("kind", [
  rollingRecipeSchema,
  rollingCustomMealSchema,
]);

export const plannerCriteriaSchema = z.object({
  dateRange: dateRangeSchema,
  dailyAudienceByMeal: z
    .array(dayAudienceByMealSchema)
    .min(1, "Select at least one day"),
  dailyTimeLimits: z.array(dayTimeLimitsSchema).min(1, "Select at least one day"),
  fridgeIngredientIds: z.array(z.string()).default([]),
  rollingMeals: z.array(rollingMealSchema).default([]),
});

export type RollingMealType = z.infer<typeof rollingMealSchema>;
/** Legacy recipe-only rolling entry shape; use RollingMealType for new code. */
export type RollingRecipeType = z.infer<typeof rollingRecipeSchema>;
export type DayTimeLimitsType = z.infer<typeof dayTimeLimitsSchema>;
export type DayAudienceByMealType = z.infer<typeof dayAudienceByMealSchema>;
export type PlannerCriteriaInputType = z.input<typeof plannerCriteriaSchema>;
export type PlannerCriteriaOutputType = z.infer<typeof plannerCriteriaSchema>;

export const slotSaveDataSchema = z
  .object({
    date: z.coerce.date(),
    mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER"]),
    recipeId: z.string().min(1).nullable(),
    customMeal: planCustomMealSchema.nullable(),
    alternativeRecipeIds: z.array(z.string().min(1)),
    cookingFamilyMemberIds: z
      .array(z.string().min(1))
      .min(1, "Choose at least one person for this meal"),
    used: z.boolean(),
    batchGroupId: z.string().min(1).nullable().optional(),
    isRolledOver: z.boolean().default(false),
    alreadyCooked: z.boolean().default(false),
  })
  .superRefine((slot, ctx) => {
    const hasRecipe = slot.recipeId != null;
    const hasCustom = slot.customMeal != null;

    if (hasRecipe && hasCustom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A slot cannot have both a recipe and a custom meal",
        path: ["customMeal"],
      });
    }
  });

export const planSlotsSaveSchema = z.array(slotSaveDataSchema).min(1);

export const planBatchStorageRowSchema = z.object({
  count: z.coerce.number().int().min(1).max(99),
  cookingFamilyMemberIds: z
    .array(z.string().min(1))
    .min(1, "Choose at least one person")
    .transform((ids) => [...new Set(ids)]),
});

export const planBatchSaveSchema = z.object({
  id: z.string().min(1),
  recipeId: z.string().min(1),
  storageRows: z.array(planBatchStorageRowSchema).max(99),
  extraPortions: z.coerce.number().int().min(0).max(99),
});

export const planBatchesSaveSchema = z
  .array(planBatchSaveSchema)
  .superRefine((batches, ctx) => {
    const seen = new Set<string>();
    batches.forEach((batch, index) => {
      if (seen.has(batch.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Batch ids must be unique",
          path: [index, "id"],
        });
      }
      seen.add(batch.id);
    });
  });
