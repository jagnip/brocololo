import { z } from "zod";

const LIST_NAME_MAX = 60;
const LIST_NAME_MIN = 1;

const trimmedRequiredName = z
  .string()
  .trim()
  .min(LIST_NAME_MIN, { message: "List name cannot be empty." })
  .max(LIST_NAME_MAX, {
    message: `Keep list name under ${LIST_NAME_MAX} characters.`,
  });

const cuid = z.string().min(1);

export const createIngredientListSchema = z.object({
  name: trimmedRequiredName,
});

export const renameIngredientListSchema = z.object({
  listId: cuid,
  name: trimmedRequiredName,
});

export const deleteIngredientListSchema = z.object({
  listId: cuid,
});

export const addIngredientToListSchema = z.object({
  listId: cuid,
  ingredientId: cuid,
});

export const removeIngredientFromListSchema = z.object({
  listId: cuid,
  ingredientId: cuid,
});

export type CreateIngredientListPayload = z.infer<
  typeof createIngredientListSchema
>;
export type RenameIngredientListPayload = z.infer<
  typeof renameIngredientListSchema
>;
export type DeleteIngredientListPayload = z.infer<
  typeof deleteIngredientListSchema
>;
export type AddIngredientToListPayload = z.infer<
  typeof addIngredientToListSchema
>;
export type RemoveIngredientFromListPayload = z.infer<
  typeof removeIngredientFromListSchema
>;
