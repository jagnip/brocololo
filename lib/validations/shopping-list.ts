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

export const shoppingListEditableItemSchema = z
  .object({
    id: z.string().min(1),
    ingredientId: z.string().min(1, { message: "Choose an ingredient." }),
    displayLabel: z.string().trim().min(1).max(120),
    unitId: z.string().min(1).nullish().transform((value) => value ?? null),
    amount: z.number().positive().nullish().transform((value) => value ?? null),
    additionalInfo: nullableTrimmedText(200, "Keep notes under 200 characters."),
    substitutionsAllowed: z.boolean(),
    substitutionNote: nullableTrimmedText(
      200,
      "Keep substitutions under 200 characters.",
    ),
  })
  .superRefine((row, ctx) => {
    const hasAmount = row.amount != null;
    const hasUnit = row.unitId != null;
    // Keep quantity semantics predictable: amount and unit should travel together.
    if (hasAmount !== hasUnit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: "Amount and unit must be set together.",
      });
    }
  });

export const saveShoppingListEditsSchema = z.object({
  planId: z.string().min(1),
  items: z.array(shoppingListEditableItemSchema).min(1),
});

export type SaveShoppingListEditsPayload = z.infer<
  typeof saveShoppingListEditsSchema
>;
