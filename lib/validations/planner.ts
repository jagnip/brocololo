import { z } from "zod";

const dateRangeSchema = z
  .object({
    start: z.string().min(1, "Start date is required"),
    end: z.string().min(1, "End date is required"),
  })
  .transform((data) => ({
    start: new Date(data.start),
    end: new Date(data.end),
  }));

const handsOnMaxField = z.coerce
  .number()
  .int()
  .positive()
  .nullable();

const dayHandsOnSchema = z.object({
  date: z.string(),
  breakfastMax: handsOnMaxField,
  lunchMax: handsOnMaxField,
  dinnerMax: handsOnMaxField,
});

const rollingRecipeSchema = z.object({
  recipeId: z.string(),
  meals: z.coerce.number().int().min(1),
});

export const plannerCriteriaSchema = z.object({
  dateRange: dateRangeSchema,
  handsOnTime: z.array(dayHandsOnSchema).min(1, "Select at least one day"),
  fridgeIngredientIds: z.array(z.string()).default([]),
  rollingRecipes: z.array(rollingRecipeSchema).default([]),
});

export type RollingRecipeType = z.infer<typeof rollingRecipeSchema>;
export type DayHandsOnType = z.infer<typeof dayHandsOnSchema>;
export type PlannerCriteriaInputType = z.input<typeof plannerCriteriaSchema>;
export type PlannerCriteriaOutputType = z.infer<typeof plannerCriteriaSchema>;