import { z } from "zod";
import { LogMealType, LogPerson } from "@/src/generated/enums";

export const logIngredientEditorRowSchema = z.object({
  ingredientId: z.string().min(1, { message: "Ingredient is required" }),
  unitId: z.string().min(1, { message: "Unit is required" }),
  amount: z.coerce
    .number()
    .positive({ message: "Amount must be greater than 0" }),
});

export const updateLogRecipeIngredientsSchema = z.object({
  logId: z.string().min(1),
  person: z.enum([LogPerson.PRIMARY, LogPerson.SECONDARY]),
  entryId: z.string().min(1),
  entryRecipeId: z.string().min(1),
  ingredients: z.array(logIngredientEditorRowSchema).max(200),
});

export type UpdateLogRecipeIngredientsInput = z.infer<
  typeof updateLogRecipeIngredientsSchema
>;

export const upsertLogSlotSchema = z.object({
  logId: z.string().min(1),
  person: z.enum([LogPerson.PRIMARY, LogPerson.SECONDARY]),
  entryId: z.string().min(1),
  recipeId: z.string().min(1).nullable(),
  ingredients: z.array(logIngredientEditorRowSchema).max(200),
});

export type UpsertLogSlotInput = z.infer<typeof upsertLogSlotSchema>;

export const addRecipeToLogSchema = z.object({
  recipeId: z.string().min(1),
  person: z.enum([LogPerson.PRIMARY, LogPerson.SECONDARY]),
  date: z.coerce.date(),
  mealType: z.enum([
    LogMealType.BREAKFAST,
    LogMealType.LUNCH,
    LogMealType.SNACK,
    LogMealType.DINNER,
  ]),
  ingredients: z.array(logIngredientEditorRowSchema).max(200),
});

export type AddRecipeToLogInput = z.input<typeof addRecipeToLogSchema>;
export type ParsedAddRecipeToLogInput = z.infer<typeof addRecipeToLogSchema>;

export const plannerPoolIngredientSchema = z.object({
  ingredientId: z.string().min(1),
  unitId: z.string().min(1),
  amount: z.coerce.number().positive(),
});

export const placePlannerPoolItemSchema = z.object({
  logId: z.string().min(1),
  person: z.enum([LogPerson.PRIMARY, LogPerson.SECONDARY]),
  entryId: z.string().min(1),
  sourceRecipeId: z.string().min(1),
  ingredients: z.array(plannerPoolIngredientSchema).max(200),
});

export type PlacePlannerPoolItemInput = z.infer<typeof placePlannerPoolItemSchema>;

export const clearLogEntryAssignmentSchema = z.object({
  logId: z.string().min(1),
  person: z.enum([LogPerson.PRIMARY, LogPerson.SECONDARY]),
  entryId: z.string().min(1),
});

export type ClearLogEntryAssignmentInput = z.infer<typeof clearLogEntryAssignmentSchema>;

export const appendNextLogDaySchema = z.object({
  logId: z.string().min(1),
});

export type AppendNextLogDayInput = z.infer<typeof appendNextLogDaySchema>;

export const removeLogDaySchema = z.object({
  logId: z.string().min(1),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type RemoveLogDayInput = z.infer<typeof removeLogDaySchema>;
