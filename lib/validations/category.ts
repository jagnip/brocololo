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

// Used by the recipe form dialog to create a missing category inline.
export const createRecipeCategorySchema = z.object({
  flavourSlug: z.enum(["savoury", "sweet"]),
  kind: z.enum([CategoryType.PROTEIN, CategoryType.RECIPE_TYPE]),
  name: z
    .string()
    .trim()
    .min(1, { message: "Enter a category name" })
    // Normalize repeated whitespace at validation boundary.
    .transform((value) => value.replace(/\s+/g, " ")),
});

export type CreateRecipeCategoryInput = z.infer<typeof createRecipeCategorySchema>;