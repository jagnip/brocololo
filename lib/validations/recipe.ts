import { z } from "zod";

export const insertRecipeSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  categories: z.array(z.string()).min(1, { message: "Categories are required" }),
  slug: z.string().min(1, { message: "Slug is required" }),
  photo: z.url({ message: "Photo must be a valid URL" }),
  handsOnTime: z.coerce.number().int().positive( { message: "Hands-on time must be a positive number" }),
  portions: z.coerce.number().int().positive( { message: "Portions must be a positive number" }),
  nutrition: z.array(z.string()).min(1, { message: "Nutrition is required" }),
  ingredients: z.array(z.string()).min(1, { message: "Ingredients are required" }),
  instructions: z.array(z.string()).min(1, { message: "Instructions are required" }),
  notes: z.array(z.string()).min(1, { message: "Notes are required" }),
});

export type InsertRecipeType = z.infer<typeof insertRecipeSchema>;