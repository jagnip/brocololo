import { z } from "zod";

export const insertRecipeSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  categories: z.array(z.string()).min(1, { message: "Categories are required" }),
  photo: z.url({ message: "Photo must be a valid URL" }),
  handsOnTime: z.coerce.number().int().positive( { message: "Hands-on time must be a positive number" }),
  portions: z.coerce.number().int().positive( { message: "Portions must be a positive number" }),
  nutrition: z.string().min(1, { message: "Nutrition is required" }).transform((val) => val.split("\n").map(line => line.trim()).filter(line => line !== "")),
  ingredients: z.string().min(1, { message: "Ingredients are required" }).transform((val) => val.split("\n").map(line => line.trim()).filter(line => line !== "")),
  instructions: z.string().min(1, { message: "Instructions are required" }).transform((val) => val.split("\n").map(line => line.trim()).filter(line => line !== "")),
  notes: z.string().min(1, { message: "Notes are required" }).transform((val) => val.split("\n").map(line => line.trim()).filter(line => line !== "")),
});

export type InsertRecipeInputType = z.input<typeof insertRecipeSchema>;
export type InsertRecipeOutputType = z.infer<typeof insertRecipeSchema>;