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

export const plannerCriteriaSchema = z.object({
  dateRange: dateRangeSchema,
  breakfastHandsOnMax: z
    .coerce
    .number()
    .int()
    .positive({ message: "Breakfast hands-on time must be a positive number" }),
  lunchHandsOnMax: z
    .coerce
    .number()
    .int()
    .positive({ message: "Lunch hands-on time must be a positive number" }),
  dinnerHandsOnMax: z
    .coerce
    .number()
    .int()
    .positive({ message: "Dinner hands-on time must be a positive number" }),
});

export type PlannerCriteriaInput = z.input<typeof plannerCriteriaSchema>;
export type PlannerCriteria = z.infer<typeof plannerCriteriaSchema>;