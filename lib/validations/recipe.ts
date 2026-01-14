import { z } from "zod";

const recipeIngredientSchema = z.object({
  ingredientId: z.string().min(1, { message: "Ingredient is required" }),
  amount: z.number().positive().min(0.1, { message: "Amount must be a positive number" }),
  unitId: z.string().min(1, { message: "Unit is required" }),
});

export const insertRecipeSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  categories: z.array(z.string()).min(1, { message: "Categories are required" }),
  imageUrl: z.url({ message: "Image must be a valid URL" }),
  handsOnTime: z.coerce.number().int().positive( { message: "Hands-on time must be a positive number" }),
  servings: z.coerce.number().int().positive( { message: "Portions must be a positive number" }),
  ingredients: z.array(recipeIngredientSchema).min(1, { message: "At least one ingredient is required" }),
  instructions: z.string().min(1, { message: "Instructions are required" }).transform((val) => val.split("\n").map(line => line.trim()).filter(line => line !== "")),
  notes: z.string().min(1, { message: "Notes are required" }).transform((val) => val.split("\n").map(line => line.trim()).filter(line => line !== "")),
});

export type InsertRecipeInputType = z.input<typeof insertRecipeSchema>;
export type InsertRecipeOutputType = z.infer<typeof insertRecipeSchema>;
export type RecipeIngredientInputType = z.infer<typeof recipeIngredientSchema>;