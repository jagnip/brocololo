import { z } from "zod";

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

const rollingRecipeSchema = z.object({
  recipeId: z.string(),
  meals: z.coerce.number().int().min(1),
});

export const plannerCriteriaSchema = z.object({
  dateRange: dateRangeSchema,
  dailyAudienceByMeal: z
    .array(dayAudienceByMealSchema)
    .min(1, "Select at least one day"),
  dailyTimeLimits: z.array(dayTimeLimitsSchema).min(1, "Select at least one day"),
  fridgeIngredientIds: z.array(z.string()).default([]),
  rollingRecipes: z.array(rollingRecipeSchema).default([]),
});

export type RollingRecipeType = z.infer<typeof rollingRecipeSchema>;
export type DayTimeLimitsType = z.infer<typeof dayTimeLimitsSchema>;
export type DayAudienceByMealType = z.infer<typeof dayAudienceByMealSchema>;
export type PlannerCriteriaInputType = z.input<typeof plannerCriteriaSchema>;
export type PlannerCriteriaOutputType = z.infer<typeof plannerCriteriaSchema>;

export const planCustomMealIngredientSchema = z.object({
  ingredientId: z.string().min(1),
  unitId: z.string().min(1).nullable(),
  amount: z.coerce.number().positive().nullable(),
});

export const planCustomMealSchema = z.object({
  name: z.string().trim().min(1, "Meal name is required"),
  ingredients: z.array(planCustomMealIngredientSchema).max(200),
});

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