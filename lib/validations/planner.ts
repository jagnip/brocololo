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

const rollingRecipeSchema = z.object({
  recipeId: z.string(),
  meals: z.coerce.number().int().min(1),
});

export const plannerCriteriaSchema = z.object({
  dateRange: dateRangeSchema,
  dailyTimeLimits: z.array(dayTimeLimitsSchema).min(1, "Select at least one day"),
  fridgeIngredientIds: z.array(z.string()).default([]),
  rollingRecipes: z.array(rollingRecipeSchema).default([]),
});

export type RollingRecipeType = z.infer<typeof rollingRecipeSchema>;
export type DayTimeLimitsType = z.infer<typeof dayTimeLimitsSchema>;
export type PlannerCriteriaInputType = z.input<typeof plannerCriteriaSchema>;
export type PlannerCriteriaOutputType = z.infer<typeof plannerCriteriaSchema>;