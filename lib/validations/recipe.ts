import { z } from "zod";

const insertRecipeSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  photo: z.string(),
  instructions: z.array(z.string()),
  handsOnTime: z.number().int().positive(),
  nutrition: z.array(z.string()),
  ingredients: z.array(z.string()),
  notes: z.array(z.string()),
  portions: z.number().int().positive(),
  categories: z.array(z.string()).optional(),
});

type InsertRecipeType = z.infer<typeof insertRecipeSchema>;