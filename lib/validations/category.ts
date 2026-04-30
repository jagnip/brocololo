import { z } from "zod";

export enum CategoryType {
  MEAL_OCCASION = "MEAL_OCCASION",
  RECIPE_TYPE = "RECIPE_TYPE",
  PROTEIN = "PROTEIN",
}

export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  type: z.enum(CategoryType),
});