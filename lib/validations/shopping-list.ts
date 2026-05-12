import { z } from "zod";

const nullableTrimmedText = (max: number, message: string) =>
  z
    .string()
    .max(max, { message })
    .nullish()
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    });

// All fields are individually optional. Rows with neither ingredientId nor a
// non-empty displayLabel are filtered out and deleted by the action layer; the
// schema deliberately allows them through so that "cleared" rows aren't blocked
// at validation time. Amount and unit are independent — either can be set alone.
export const shoppingListEditableItemSchema = z.object({
  id: z.string().min(1),
  // True when the row was added in the edit form and hasn't been persisted yet;
  // the action layer uses this to route the row through create instead of update.
  isNew: z.boolean(),
  ingredientId: z.string().min(1).nullish().transform((value) => value ?? null),
  ingredientCategoryId: z.string().min(1),
  displayLabel: z.string().trim().max(120),
  unitId: z.string().min(1).nullish().transform((value) => value ?? null),
  amount: z.number().positive().nullish().transform((value) => value ?? null),
  additionalInfo: nullableTrimmedText(200, "Keep notes under 200 characters."),
  substitutionsAllowed: z.boolean(),
  substitutionNote: nullableTrimmedText(
    200,
    "Keep substitutions under 200 characters.",
  ),
});

export const saveShoppingListEditsSchema = z.object({
  planId: z.string().min(1),
  // Allow saving even when every row was cleared (results in a full delete).
  items: z.array(shoppingListEditableItemSchema),
});

export const deleteActiveShoppingLayoutPresetSchema = z.object({
  planId: z.string().min(1),
  presetId: z.string().min(1),
});

export type SaveShoppingListEditsPayload = z.infer<
  typeof saveShoppingListEditsSchema
>;
