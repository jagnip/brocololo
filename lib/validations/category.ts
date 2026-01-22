import { z } from "zod";

export enum CategoryType {
  FLAVOUR = "FLAVOUR",
  RECIPE_TYPE = "RECIPE_TYPE",
  PROTEIN = "PROTEIN",
}

export const categorySchema = z.object({
  id: z.cuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  type: z.enum(CategoryType),
});